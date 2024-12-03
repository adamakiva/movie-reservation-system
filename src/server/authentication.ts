import {
  argon2,
  HTTP_STATUS_CODES,
  jose,
  MRSError,
  readFile,
  type NextFunction,
  type Request,
  type ResponseWithCtx,
} from '../utils/index.js';

/**********************************************************************************/

class AuthenticationManager {
  readonly #audience;
  readonly #issuer;
  readonly #alg;
  readonly #access;
  readonly #refresh;
  readonly #hashSecret;

  public static async create(params: {
    audience: string;
    issuer: string;
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
    const { audience, issuer, alg, access, refresh, keysPath, hashSecret } =
      params;

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

  public async httpAuthenticationMiddleware(
    req: Request,
    _res: ResponseWithCtx,
    next: NextFunction,
  ) {
    await this.#checkAuthenticationToken(req.headers.authorization);

    next();
  }

  public getExpirationTime() {
    const now = Date.now();

    return {
      accessTokenExpirationTime: now + this.#access.expiresAt,
      refreshTokenExpirationTime: now + this.#refresh.expiresAt,
    };
  }

  public async generateAccessToken(
    userId: string,
    accessTokenExpirationTime: number,
  ) {
    return await new jose.SignJWT()
      .setSubject(userId)
      .setAudience(this.#audience)
      .setIssuer(this.#issuer)
      .setIssuedAt()
      .setExpirationTime(accessTokenExpirationTime)
      .setProtectedHeader({ alg: this.#alg })
      .sign(this.#access.privateKey);
  }

  public async generateRefreshToken(
    userId: string,
    refreshTokenExpirationTime: number,
  ) {
    return await new jose.SignJWT()
      .setSubject(userId)
      .setAudience(this.#audience)
      .setIssuer(this.#issuer)
      .setIssuedAt()
      .setExpirationTime(refreshTokenExpirationTime)
      .setProtectedHeader({ alg: this.#alg })
      .sign(this.#refresh.privateKey);
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

    return await jose.jwtVerify(token, publicKey, {
      audience: this.#audience,
      issuer: this.#issuer,
    });
  }

  public async hashPassword(password: string) {
    return await argon2.hash(password, { type: 1, secret: this.#hashSecret });
  }

  public async verifyPassword(hash: string, password: string) {
    return await argon2.verify(hash, password, { secret: this.#hashSecret });
  }

  /********************************************************************************/

  private constructor(params: {
    audience: string;
    issuer: string;
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
    const { audience, issuer, alg, access, refresh, hashSecret } = params;

    this.#audience = audience;
    this.#issuer = issuer;
    this.#alg = alg;
    this.#access = access;
    this.#refresh = refresh;
    this.#hashSecret = hashSecret;
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
