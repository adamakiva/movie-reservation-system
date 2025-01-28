import type { Request } from 'express';
import { object as ZodObject, string as ZodString } from 'zod';

import { parseValidationResult, VALIDATION } from '../utils.validator.js';

/**********************************************************************************/

const { USER, AUTHENTICATION, BODY } = VALIDATION;

/**********************************************************************************/

const loginSchema = ZodObject(
  {
    email: ZodString({
      invalid_type_error: USER.EMAIL.INVALID_TYPE_ERROR_MESSAGE,
      required_error: USER.EMAIL.REQUIRED_ERROR_MESSAGE,
    })
      .min(USER.EMAIL.MIN_LENGTH.VALUE, USER.EMAIL.MIN_LENGTH.ERROR_MESSAGE)
      .max(USER.EMAIL.MAX_LENGTH.VALUE, USER.EMAIL.MAX_LENGTH.ERROR_MESSAGE)
      .email(USER.EMAIL.ERROR_MESSAGE),
    password: ZodString({
      invalid_type_error: USER.PASSWORD.INVALID_TYPE_ERROR_MESSAGE,
      required_error: USER.PASSWORD.REQUIRED_ERROR_MESSAGE,
    })
      .min(
        USER.PASSWORD.MIN_LENGTH.VALUE,
        USER.PASSWORD.MIN_LENGTH.ERROR_MESSAGE,
      )
      .max(
        USER.PASSWORD.MAX_LENGTH.VALUE,
        USER.PASSWORD.MAX_LENGTH.ERROR_MESSAGE,
      ),
  },
  {
    invalid_type_error: BODY.INVALID_TYPE_ERROR_MESSAGE,
    required_error: BODY.REQUIRED_ERROR_MESSAGE,
  },
);

const refreshTokenSchema = ZodObject(
  {
    refreshToken: ZodString({
      invalid_type_error:
        AUTHENTICATION.REFRESH.TOKEN.INVALID_TYPE_ERROR_MESSAGE,
      required_error: AUTHENTICATION.REFRESH.TOKEN.REQUIRED_ERROR_MESSAGE,
    }).jwt({
      message: AUTHENTICATION.REFRESH.TOKEN.ERROR_MESSAGE,
    }),
  },
  {
    invalid_type_error: BODY.INVALID_TYPE_ERROR_MESSAGE,
    required_error: BODY.REQUIRED_ERROR_MESSAGE,
  },
);

/**********************************************************************************/

function validateLogin(req: Request) {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const { body } = req;

  const validatedResult = loginSchema.safeParse(body);
  const parsedValidatedResult = parseValidationResult(validatedResult);

  return parsedValidatedResult;
}

function validateRefreshAccessToken(req: Request) {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const { body } = req;

  const validatedResult = refreshTokenSchema.safeParse(body);
  const parsedValidatedResult = parseValidationResult(validatedResult);

  return parsedValidatedResult;
}

/**********************************************************************************/

export { validateLogin, validateRefreshAccessToken };
