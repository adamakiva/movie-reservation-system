import type { Request } from 'express';

import { HTTP_STATUS_CODES } from '../utils/index.js';

import { loginSchema, parseValidationResult } from './utils.js';

/**********************************************************************************/

function validateLogin(req: Request) {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const { body } = req;

  return parseValidationResult(
    loginSchema.safeParse(body),
    HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
  );
}

/**********************************************************************************/

export { validateLogin };
