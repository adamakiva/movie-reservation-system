import { authenticationService } from '../services/index.js';
import {
  HTTP_STATUS_CODES,
  type NextFunction,
  type Request,
  type ResponseWithCtx,
} from '../utils/index.js';
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

async function refreshAccessToken(
  req: Request,
  res: ResponseWithCtx,
  next: NextFunction,
) {
  try {
    const { refreshToken } =
      authenticationValidator.validateRefreshAccessToken(req);

    const result = await authenticationService.refreshAccessToken(
      res.locals.context,
      refreshToken,
    );

    res.status(HTTP_STATUS_CODES.CREATED).json(result);
  } catch (err) {
    next(err);
  }
}

/**********************************************************************************/

export { login, refreshAccessToken };
