import { readFile } from 'node:fs/promises';

import { HTTP_STATUS_CODES } from '@adamakiva/movie-reservation-system-shared';
import { argon2i, hash, verify } from 'argon2';
import type { NextFunction, Request, Response } from 'express';
import * as jose from 'jose';

import { GeneralError, UnauthorizedError } from '../../utils/errors.ts';

/**********************************************************************************/

class AuthenticationManager {
  readonly #audience;
  readonly #issuer;
  readonly #header;
  readonly #access;
  readonly #refresh;
  readonly #hashSecret;

  readonly #boundHttpAuthenticationMiddleware;

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

    const {
      publicAccessKey,
      privateAccessKey,
      publicRefreshKey,
      privateRefreshKey,
    } = await AuthenticationManager.#readKeysFromFile(keysPath, algorithm);

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

  public async validateToken(
    token: string,
    type: ['access', 'refresh'][number],
  ) {
    let publicKey: jose.CryptoKey = null!;
    switch (type) {
      case 'access': {
        ({ publicKey } = this.#access);
        break;
      }
      case 'refresh': {
        ({ publicKey } = this.#refresh);
        break;
      }
    }

    try {
      return await jose.jwtVerify(token, publicKey, {
        audience: this.#audience,
        issuer: this.#issuer,
      });
    } catch (error) {
      if (error instanceof jose.errors.JWTExpired) {
        throw new UnauthorizedError('expired', error.cause);
      }
      if (error instanceof jose.errors.JWSInvalid) {
        throw new UnauthorizedError('malformed', error.cause);
      }

      throw new GeneralError(
        HTTP_STATUS_CODES.UNAUTHORIZED,
        'Unexpected error:',
        error,
      );
    }
  }

  public getUserId(authenticationHeader: string) {
    const token = authenticationHeader.replace('Bearer', '');

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

  public async verifyWebsocketAuthentication(token: string) {
    const {
      payload: { sub, exp },
    } = await this.validateToken(token, 'access');

    return !!sub && !!exp;
  }

  public httpAuthenticationMiddleware() {
    return this.#boundHttpAuthenticationMiddleware;
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

    this.#boundHttpAuthenticationMiddleware =
      this.#httpAuthenticationMiddleware.bind(this);
  }

  static async #readKeysFromFile(keysPath: string, algorithm: string) {
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
      jose.importSPKI(accessPublicKey, algorithm),
      jose.importPKCS8(accessPrivateKey, algorithm),
      jose.importSPKI(refreshPublicKey, algorithm),
      jose.importPKCS8(refreshPrivateKey, algorithm),
    ]);

    return {
      publicAccessKey,
      privateAccessKey,
      publicRefreshKey,
      privateRefreshKey,
    } as const;
  }

  async #httpAuthenticationMiddleware(
    request: Request,
    _response: Response,
    next: NextFunction,
  ) {
    const authenticationHeader = request.headers.authorization;
    if (!authenticationHeader) {
      throw new UnauthorizedError('missing');
    }
    const token = authenticationHeader.replace('Bearer', '');

    const {
      payload: { sub, exp },
    } = await this.validateToken(token, 'access');
    if (!sub || !exp) {
      throw new UnauthorizedError('malformed');
    }

    next();
  }
}

/**********************************************************************************/

export { AuthenticationManager };
