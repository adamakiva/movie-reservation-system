import { readFile } from 'node:fs/promises';

import { argon2i, hash, verify } from 'argon2';
import type { NextFunction, Request } from 'express';
import * as jose from 'jose';

import {
  UnauthorizedError,
  type ResponseWithContext,
} from '../../utils/index.ts';

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
      jose.importSPKI(accessPublicKey, algorithm),
      jose.importPKCS8(accessPrivateKey, algorithm),
      jose.importSPKI(refreshPublicKey, algorithm),
      jose.importPKCS8(refreshPrivateKey, algorithm),
    ]);

    return new AuthenticationManager({
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
  }

  public httpAuthenticationMiddleware() {
    // Since the class function is used as a middleware we need to bind `this`
    // to access the class methods/members
    return this.#httpAuthenticationMiddleware.bind(this);
  }

  public getExpirationTime() {
    // JWT expects exp in seconds since epoch, not milliseconds
    const now = Math.round(Date.now() / 1_000);

    return {
      accessTokenExpirationTime: now + this.#access.expiresAt,
      refreshTokenExpirationTime: now + this.#refresh.expiresAt,
    } as const;
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
      .setProtectedHeader(this.#header)
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
      .setProtectedHeader(this.#header)
      .sign(this.#refresh.privateKey);
  }

  public async validateToken(token: string, type: TokenTypes[number]) {
    let publicKey: jose.CryptoKey = null!;
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

  public getUserId(authorizationHeader: string) {
    const token = authorizationHeader.replace('Bearer', '');

    const decodedJwt = jose.decodeJwt(token);

    return decodedJwt.sub!;
  }

  public async hashPassword(password: string) {
    return await hash(password, {
      type: argon2i,
      secret: this.#hashSecret,
    });
  }

  public async verifyPassword(hash: string, password: string) {
    return await verify(hash, password, {
      secret: this.#hashSecret,
    });
  }

  /********************************************************************************/

  private constructor(params: {
    audience: string;
    issuer: string;
    type: string;
    algorithm: string;
    access: {
      publicKey: jose.CryptoKey;
      privateKey: jose.CryptoKey;
      expiresAt: number;
    };
    refresh: {
      publicKey: jose.CryptoKey;
      privateKey: jose.CryptoKey;
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
      if (err instanceof jose.errors.JWTExpired) {
        throw new UnauthorizedError('expired', err.cause);
      }
      if (err instanceof jose.errors.JWSInvalid) {
        throw new UnauthorizedError('malformed', err.cause);
      }

      throw err;
    }
  }
}

/**********************************************************************************/

export default AuthenticationManager;
