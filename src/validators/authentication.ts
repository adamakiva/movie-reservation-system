import { type Request, HTTP_STATUS_CODES } from '../utils/index.js';

import {
  loginSchema,
  parseValidationResult,
  refreshTokenSchema,
} from './utils.js';

/**********************************************************************************/

function validateLogin(req: Request) {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const { body } = req;

  return parseValidationResult(
    loginSchema.safeParse(body),
    HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
  );
}

function validateRefresh(req: Request) {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const { body } = req;

  return parseValidationResult(
    refreshTokenSchema.safeParse(body),
    HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
  );
}

/**********************************************************************************/

export { validateLogin, validateRefresh };
