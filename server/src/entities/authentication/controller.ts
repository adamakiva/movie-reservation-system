import type { Request } from 'express';

import {
  HTTP_STATUS_CODES,
  type ResponseWithContext,
} from '../../utils/index.js';

import * as authenticationService from './service/index.js';
import * as authenticationValidator from './validator.js';

/**********************************************************************************/

async function login(req: Request, res: ResponseWithContext) {
  const credentials = authenticationValidator.validateLogin(req);

  const result = await authenticationService.login(
    res.locals.context,
    credentials,
  );

  res.status(HTTP_STATUS_CODES.CREATED).send(result);
}

async function refreshAccessToken(req: Request, res: ResponseWithContext) {
  const { refreshToken } =
    authenticationValidator.validateRefreshAccessToken(req);

  const result = await authenticationService.refreshAccessToken(
    res.locals.context,
    refreshToken,
  );

  res.status(HTTP_STATUS_CODES.SUCCESS).send(result);
}

/**********************************************************************************/

export { login, refreshAccessToken };
