import {
  argon2,
  HTTP_STATUS_CODES,
  jose,
  MRSError,
  readFile,
  type NextFunction,
  type Request,
  type ResponseWithCtx,
} from '../../utils/index.js';

/**********************************************************************************/

class AuthenticationManager {
  readonly #audience;
  readonly #issuer;
  readonly #header;
  readonly #access;
  readonly #refresh;
  readonly #hashSecret;

  public static async create(params: {
    audience: string;
    issuer: string;
    typ: string;
    alg: string;
    access: {
      expiresAt: number;
    };
    refresh: {
      expiresAt: number;
    };
    keysPath: string;
    hashSecret: Buffer;
  }) {
    const {
      audience,
      issuer,
      typ,
      alg,
      access,
      refresh,
      keysPath,
      hashSecret,
    } = params;

    const encoding = { encoding: 'utf-8' } as const;

    const [
      accessPublicKey,
      accessPrivateKey,
      refreshPublicKey,
      refreshPrivateKey,
    ] = await Promise.all([
      readFile(`${keysPath}/access_public_key.pem`, encoding),
      readFile(`${keysPath}/access_private_key.pem`, encoding),
      readFile(`${keysPath}/refresh_public_key.pem`, encoding),
      readFile(`${keysPath}/refresh_private_key.pem`, encoding),
    ]);

    const [
      publicAccessKey,
      privateAccessKey,
      publicRefreshKey,
      privateRefreshKey,
    ] = await Promise.all([
      jose.importSPKI(accessPublicKey, alg),
      jose.importPKCS8(accessPrivateKey, alg),
      jose.importSPKI(refreshPublicKey, alg),
      jose.importPKCS8(refreshPrivateKey, alg),
    ]);

    const self = new AuthenticationManager({
      audience,
      issuer,
      typ,
      alg,
      access: {
        publicKey: publicAccessKey,
        privateKey: privateAccessKey,
        expiresAt: access.expiresAt,
      },
      refresh: {
        publicKey: publicRefreshKey,
        privateKey: privateRefreshKey,
        expiresAt: refresh.expiresAt,
      },
      hashSecret,
    });

    return self;
  }

  public httpAuthenticationMiddleware() {
    // Since the class function is used as a middleware we need to bind `this`
    // to access the class methods/members
    return this.#httpAuthenticationMiddleware.bind(this);
  }

  public getExpirationTime() {
    // JWT expects exp in seconds since epoch, not milliseconds
    const now = Math.round(Date.now() / 1_000);

    const result = {
      accessTokenExpirationTime: now + this.#access.expiresAt,
      refreshTokenExpirationTime: now + this.#refresh.expiresAt,
    } as const;

    return result;
  }

  public async generateAccessToken(
    userId: string,
    accessTokenExpirationTime: number,
  ) {
    const jwt = await new jose.SignJWT()
      .setSubject(userId)
      .setAudience(this.#audience)
      .setIssuer(this.#issuer)
      .setIssuedAt()
      .setExpirationTime(accessTokenExpirationTime)
      .setProtectedHeader(this.#header)
      .sign(this.#access.privateKey);

    return jwt;
  }

  public async generateRefreshToken(
    userId: string,
    refreshTokenExpirationTime: number,
  ) {
    const jwt = await new jose.SignJWT()
      .setSubject(userId)
      .setAudience(this.#audience)
      .setIssuer(this.#issuer)
      .setIssuedAt()
      .setExpirationTime(refreshTokenExpirationTime)
      .setProtectedHeader(this.#header)
      .sign(this.#refresh.privateKey);

    return jwt;
  }

  public async validateToken(token: string, type: 'access' | 'refresh') {
    let publicKey: jose.KeyLike = null!;
    switch (type) {
      case 'access':
        ({ publicKey } = this.#access);
        break;
      case 'refresh':
        ({ publicKey } = this.#refresh);
        break;
    }

    const parsedJwt = await jose.jwtVerify(token, publicKey, {
      audience: this.#audience,
      issuer: this.#issuer,
    });

    return parsedJwt;
  }

  public async hashPassword(password: string) {
    const hashedPassword = await argon2.hash(password, {
      type: 1,
      secret: this.#hashSecret,
    });

    return hashedPassword;
  }

  public async verifyPassword(hash: string, password: string) {
    const isValid = await argon2.verify(hash, password, {
      secret: this.#hashSecret,
    });

    return isValid;
  }

  /********************************************************************************/

  private constructor(params: {
    audience: string;
    issuer: string;
    typ: string;
    alg: string;
    access: {
      publicKey: jose.KeyLike;
      privateKey: jose.KeyLike;
      expiresAt: number;
    };
    refresh: {
      publicKey: jose.KeyLike;
      privateKey: jose.KeyLike;
      expiresAt: number;
    };
    hashSecret: Buffer;
  }) {
    const { audience, issuer, typ, alg, access, refresh, hashSecret } = params;

    this.#audience = audience;
    this.#issuer = issuer;
    this.#header = { typ, alg } as const;
    this.#access = access;
    this.#refresh = refresh;
    this.#hashSecret = hashSecret;
  }

  async #httpAuthenticationMiddleware(
    req: Request,
    _res: ResponseWithCtx,
    next: NextFunction,
  ) {
    await this.#checkAuthenticationToken(req.headers.authorization);

    next();
  }

  async #checkAuthenticationToken(authorizationHeader?: string) {
    try {
      if (!authorizationHeader) {
        throw new MRSError(
          HTTP_STATUS_CODES.UNAUTHORIZED,
          'Missing authorization header',
        );
      }
      const token = authorizationHeader.replace('Bearer', '');

      const {
        payload: { sub },
      } = await this.validateToken(token, 'access');
      if (!sub) {
        throw new MRSError(
          HTTP_STATUS_CODES.UNAUTHORIZED,
          'Invalid access token',
        );
      }
    } catch (err) {
      // TODO Check error thrown by exp passed and throw a specific error for it
      if (err instanceof MRSError) {
        throw err;
      }

      if (err instanceof jose.errors.JWSInvalid) {
        throw new MRSError(
          HTTP_STATUS_CODES.UNAUTHORIZED,
          'Malformed JWT token',
        );
      }
    }
  }
}

/**********************************************************************************/

export default AuthenticationManager;
