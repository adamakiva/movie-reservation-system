import { readFile } from 'node:fs/promises';

import { hash, verify } from 'argon2';
import type { NextFunction, Request } from 'express';
import {
  decodeJwt,
  importPKCS8,
  importSPKI,
  errors as joseErrors,
  jwtVerify,
  SignJWT,
  type KeyLike,
} from 'jose';

import {
  UnauthorizedError,
  type ResponseWithContext,
} from '../../utils/index.js';

/**********************************************************************************/

type TokenTypes = ['access', 'refresh'];

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
    type: string;
    algorithm: string;
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
      type,
      algorithm,
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
      // These path are defined by the programmer, not the end user
      /* eslint-disable @security/detect-non-literal-fs-filename */
      readFile(`${keysPath}/access_public_key.pem`, encoding),
      readFile(`${keysPath}/access_private_key.pem`, encoding),
      readFile(`${keysPath}/refresh_public_key.pem`, encoding),
      readFile(`${keysPath}/refresh_private_key.pem`, encoding),
      /* eslint-enable @security/detect-non-literal-fs-filename */
    ]);

    const [
      publicAccessKey,
      privateAccessKey,
      publicRefreshKey,
      privateRefreshKey,
    ] = await Promise.all([
      importSPKI(accessPublicKey, algorithm),
      importPKCS8(accessPrivateKey, algorithm),
      importSPKI(refreshPublicKey, algorithm),
      importPKCS8(refreshPrivateKey, algorithm),
    ]);

    const self = new AuthenticationManager({
      audience,
      issuer,
      type,
      algorithm,
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
    const jwt = await new SignJWT()
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
    const jwt = await new SignJWT()
      .setSubject(userId)
      .setAudience(this.#audience)
      .setIssuer(this.#issuer)
      .setIssuedAt()
      .setExpirationTime(refreshTokenExpirationTime)
      .setProtectedHeader(this.#header)
      .sign(this.#refresh.privateKey);

    return jwt;
  }

  public async validateToken(token: string, type: TokenTypes[number]) {
    let publicKey: KeyLike = null!;
    switch (type) {
      case 'access':
        ({ publicKey } = this.#access);
        break;
      case 'refresh':
        ({ publicKey } = this.#refresh);
        break;
    }

    const parsedJwt = await jwtVerify(token, publicKey, {
      audience: this.#audience,
      issuer: this.#issuer,
    });

    return parsedJwt;
  }

  public getUserId(authorizationHeader: string) {
    const token = authorizationHeader.replace('Bearer', '');

    const decodedJwt = decodeJwt(token);

    return decodedJwt.sub!;
  }

  public async hashPassword(password: string) {
    const hashedPassword = await hash(password, {
      type: 1,
      secret: this.#hashSecret,
    });

    return hashedPassword;
  }

  public async verifyPassword(hash: string, password: string) {
    const isValid = await verify(hash, password, {
      secret: this.#hashSecret,
    });

    return isValid;
  }

  /********************************************************************************/

  private constructor(params: {
    audience: string;
    issuer: string;
    type: string;
    algorithm: string;
    access: {
      publicKey: KeyLike;
      privateKey: KeyLike;
      expiresAt: number;
    };
    refresh: {
      publicKey: KeyLike;
      privateKey: KeyLike;
      expiresAt: number;
    };
    hashSecret: Buffer;
  }) {
    const { audience, issuer, type, algorithm, access, refresh, hashSecret } =
      params;

    this.#audience = audience;
    this.#issuer = issuer;
    this.#header = { typ: type, alg: algorithm } as const;
    this.#access = access;
    this.#refresh = refresh;
    this.#hashSecret = hashSecret;
  }

  async #httpAuthenticationMiddleware(
    req: Request,
    _res: ResponseWithContext,
    next: NextFunction,
  ) {
    await this.#checkAuthenticationToken(req.headers.authorization);

    next();
  }

  async #checkAuthenticationToken(authorizationHeader?: string) {
    try {
      if (!authorizationHeader) {
        throw new UnauthorizedError('missing');
      }
      const token = authorizationHeader.replace('Bearer', '');

      const {
        payload: { sub, exp },
      } = await this.validateToken(token, 'access');
      if (!sub || !exp) {
        throw new UnauthorizedError('malformed');
      }
    } catch (err) {
      if (err instanceof joseErrors.JWTExpired) {
        throw new UnauthorizedError('expired', err.cause);
      }
      if (err instanceof joseErrors.JWSInvalid) {
        throw new UnauthorizedError('malformed', err.cause);
      }

      throw err;
    }
  }
}

/**********************************************************************************/

export default AuthenticationManager;
export type { TokenTypes };
