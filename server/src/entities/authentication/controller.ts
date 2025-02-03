import type { Request } from 'express';

import {
  HTTP_STATUS_CODES,
  type ResponseWithContext,
} from '../../utils/index.ts';

import * as authenticationService from './service/index.ts';
import * as authenticationValidator from './validator.ts';

/**********************************************************************************/

async function login(req: Request, res: ResponseWithContext) {
  const credentials = authenticationValidator.validateLogin(req);

  const result = await authenticationService.login(
    res.locals.context,
    credentials,
  );

  res.status(HTTP_STATUS_CODES.CREATED).json(result);
}

async function refreshAccessToken(req: Request, res: ResponseWithContext) {
  const { refreshToken } =
    authenticationValidator.validateRefreshAccessToken(req);

  const result = await authenticationService.refreshAccessToken(
    res.locals.context,
    refreshToken,
  );

  res.status(HTTP_STATUS_CODES.SUCCESS).json(result);
}

/**********************************************************************************/

export { login, refreshAccessToken };
