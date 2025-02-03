import type { Request } from 'express';

import { parseValidationResult, SCHEMAS } from '../utils.validator.ts';

/**********************************************************************************/

const { AUTHENTICATION } = SCHEMAS;

/**********************************************************************************/

function validateLogin(req: Request) {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const { body } = req;

  const validatedResult = AUTHENTICATION.LOGIN.safeParse(body);
  const parsedValidatedResult = parseValidationResult(validatedResult);

  return parsedValidatedResult;
}

function validateRefreshAccessToken(req: Request) {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const { body } = req;

  const validatedResult = AUTHENTICATION.REFRESH.safeParse(body);
  const parsedValidatedResult = parseValidationResult(validatedResult);

  return parsedValidatedResult;
}

/**********************************************************************************/

export { validateLogin, validateRefreshAccessToken };
