import { and, eq, lt } from 'drizzle-orm';
import type { NextFunction, Request } from 'express';

import {
  HTTP_STATUS_CODES,
  MRSError,
  type RequestContext,
  type ResponseWithCtx,
} from '../utils/index.js';

/**********************************************************************************/

class AuthenticationManager {
  public async httpAuthenticationMiddleware(
    req: Request,
    res: ResponseWithCtx,
    next: NextFunction,
  ) {
    try {
      await this.#checkAuthenticationToken(
        res.locals.context.db,
        req.headers.authorization,
      );

      next();
    } catch (err) {
      next(err);
    }
  }

  /********************************************************************************/

  async #checkAuthenticationToken(
    db: RequestContext['db'],
    authenticationHeader?: string,
  ) {
    if (!authenticationHeader) {
      throw new MRSError(HTTP_STATUS_CODES.UNAUTHORIZED, 'Unauthorized');
    }

    const handler = db.getHandler();
    const model = db.getModels().authentication;

    const authenticationToken = authenticationHeader.replace('Bearer', '');
    const sub = authenticationToken; // TODO Decode JWT and take sub from it
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
