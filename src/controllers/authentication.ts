import { authenticationService } from '../services/index.js';
import {
  HTTP_STATUS_CODES,
  type Request,
  type ResponseWithCtx,
} from '../utils/index.js';
import { authenticationValidator } from '../validators/index.js';

/**********************************************************************************/

async function login(req: Request, res: ResponseWithCtx) {
  const credentials = authenticationValidator.validateLogin(req);

  const result = await authenticationService.login(
    res.locals.context,
    credentials,
  );

  res.status(HTTP_STATUS_CODES.CREATED).json(result);
}

async function refreshAccessToken(req: Request, res: ResponseWithCtx) {
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
