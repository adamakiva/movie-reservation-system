import type { NextFunction, Request } from 'express';

import { authenticationService } from '../services/index.js';
import { type ResponseWithCtx, HTTP_STATUS_CODES } from '../utils/index.js';
import { authenticationValidator } from '../validators/index.js';

/**********************************************************************************/

async function login(req: Request, res: ResponseWithCtx, next: NextFunction) {
  try {
    const credentials = authenticationValidator.validateLogin(req);

    const result = await authenticationService.login(
      res.locals.context,
      credentials,
    );

    res.status(HTTP_STATUS_CODES.SUCCESS).json(result);
  } catch (err) {
    next(err);
  }
}

async function refresh(req: Request, res: ResponseWithCtx, next: NextFunction) {
  try {
    const { refreshToken } = authenticationValidator.validateRefresh(req);

    const result = await authenticationService.refresh(
      res.locals.context,
      refreshToken,
    );

    res.status(HTTP_STATUS_CODES.CREATED).json(result);
  } catch (err) {
    next(err);
  }
}

/**********************************************************************************/

export { login, refresh };
