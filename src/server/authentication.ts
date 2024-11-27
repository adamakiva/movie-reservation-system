import type { NextFunction, Request } from 'express';
import jose from 'jose';

import {
  HTTP_STATUS_CODES,
  MRSError,
  type ResponseWithCtx,
} from '../utils/index.js';

/**********************************************************************************/

class AuthenticationManager {
  readonly #audience;
  readonly #issuer;
  readonly #alg;
  readonly #access;
  readonly #refresh;

  public static async create(params: {
    audience: string;
    issuer: string;
    alg: string;
    access: {
      publicKey: string;
      privateKey: string;
      expiresAt: number;
    };
    refresh: {
      publicKey: string;
      privateKey: string;
      expiresAt: number;
    };
  }) {
    const { audience, issuer, alg, access, refresh } = params;

    const [
      publicAccessKey,
      privateAccessKey,
      publicRefreshKey,
      privateRefreshKey,
    ] = await Promise.all([
      jose.importSPKI(access.publicKey, alg),
      jose.importPKCS8(access.privateKey, alg),
      jose.importPKCS8(refresh.publicKey, alg),
      jose.importSPKI(refresh.privateKey, alg),
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
    });

    return self;
  }

  public async httpAuthenticationMiddleware(
    req: Request,
    _res: ResponseWithCtx,
    next: NextFunction,
  ) {
    try {
      await this.#checkAuthenticationToken(req.headers.authorization);

      next();
    } catch (err) {
      next(err);
    }
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
  }) {
    const { audience, issuer, alg, access, refresh } = params;

    this.#audience = audience;
    this.#issuer = issuer;
    this.#alg = alg;
    this.#access = access;
    this.#refresh = refresh;
  }

  async #checkAuthenticationToken(authenticationHeader?: string) {
    try {
      if (!authenticationHeader) {
        throw new MRSError(
          HTTP_STATUS_CODES.UNAUTHORIZED,
          'Missing authentication header',
        );
      }
      const token = authenticationHeader.replace('Bearer', '');

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
      if (err instanceof MRSError) {
        throw err;
      }

      throw new MRSError(HTTP_STATUS_CODES.UNAUTHORIZED, 'Unauthorized');
    }
  }
}

/**********************************************************************************/

export default AuthenticationManager;
