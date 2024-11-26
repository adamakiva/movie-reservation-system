import { and, eq, lt } from 'drizzle-orm';
import type { NextFunction, Request } from 'express';
import jose from 'jose';

import {
  HTTP_STATUS_CODES,
  MRSError,
  type RequestContext,
  type ResponseWithCtx,
} from '../utils/index.js';

/**********************************************************************************/

class AuthenticationManager {
  readonly #audience;
  readonly #issuer;
  readonly #expTime;
  readonly #alg;
  readonly #privateAccessKey;
  readonly #privateRefreshKey;

  public static async create(params: {
    audience: string;
    issuer: string;
    expTime: string;
    alg: string;
    privateAccessKey: string;
    privateRefreshKey: string;
  }) {
    const [privateAccessKey, privateRefreshKey] = await Promise.all([
      jose.importPKCS8(params.privateAccessKey, params.alg),
      jose.importPKCS8(params.privateRefreshKey, params.alg),
    ]);

    const self = new AuthenticationManager({
      audience: params.audience,
      issuer: params.issuer,
      expTime: params.expTime,
      alg: params.alg,
      privateAccessKey,
      privateRefreshKey,
    });

    return self;
  }

  public async httpAuthenticationMiddleware(
    req: Request,
    res: ResponseWithCtx,
    next: NextFunction,
  ) {
    try {
      await this.#checkAuthenticationToken(
        res.locals.context.database,
        req.headers.authorization,
      );

      next();
    } catch (err) {
      next(err);
    }
  }

  public async generateTokens(userId: string) {
    const [accessToken, refreshToken] = await Promise.all([
      new jose.SignJWT()
        .setSubject(userId)
        .setAudience(this.#audience)
        .setIssuer(this.#issuer)
        .setIssuedAt()
        .setExpirationTime(this.#expTime)
        .setProtectedHeader({ alg: this.#alg })
        .sign(this.#privateAccessKey),
      new jose.SignJWT()
        .setSubject(userId)
        .setAudience(this.#audience)
        .setIssuer(this.#issuer)
        .setIssuedAt()
        .setExpirationTime(this.#expTime)
        .setProtectedHeader({ alg: this.#alg })
        .sign(this.#privateRefreshKey),
    ]);

    return { accessToken, refreshToken };
  }

  /********************************************************************************/

  private constructor(params: {
    audience: string;
    issuer: string;
    expTime: string;
    alg: string;
    privateAccessKey: jose.KeyLike;
    privateRefreshKey: jose.KeyLike;
  }) {
    this.#audience = params.audience;
    this.#issuer = params.issuer;
    this.#expTime = params.expTime;
    this.#alg = params.alg;
    this.#privateAccessKey = params.privateAccessKey;
    this.#privateRefreshKey = params.privateRefreshKey;
  }

  async #checkAuthenticationToken(
    db: RequestContext['database'],
    authenticationHeader?: string,
  ) {
    if (!authenticationHeader) {
      throw new MRSError(HTTP_STATUS_CODES.UNAUTHORIZED, 'Unauthorized');
    }

    const handler = db.getHandler();
    const model = db.getModels().authentication;

    const authenticationToken = authenticationHeader.replace('Bearer', '');
    const { sub } = jose.decodeJwt(authenticationToken);
    if (!sub) {
      throw new MRSError(HTTP_STATUS_CODES.UNAUTHORIZED, 'Unauthorized');
    }

    const res = await handler
      .select({ expiresAt: model.expiresAt })
      .from(model)
      .where(and(eq(model.userId, sub), lt(model.expiresAt, Date.now())));
    if (!res.length) {
      throw new MRSError(HTTP_STATUS_CODES.UNAUTHORIZED, 'Unauthorized');
    }
  }
}

/**********************************************************************************/

export default AuthenticationManager;
