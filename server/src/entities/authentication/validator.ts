import type { Request } from 'express';
import zod from 'zod';

import { parseValidationResult, VALIDATION } from '../utils.ts';

/**********************************************************************************/

const { BODY } = VALIDATION;

const AUTHENTICATION = {
  REFRESH: {
    TOKEN: {
      ERROR_MESSAGE: 'Invalid refresh token',
      INVALID_TYPE_ERROR_MESSAGE: 'Refresh token must be a string',
      REQUIRED_ERROR_MESSAGE: 'Refresh token is required',
    },
  },
} as const;

const USER = {
  EMAIL: {
    ERROR_MESSAGE: 'Invalid email address',
    INVALID_TYPE_ERROR_MESSAGE: 'Email address must be a string',
    REQUIRED_ERROR_MESSAGE: 'Email address is required',
    MIN_LENGTH: {
      VALUE: 3,
      ERROR_MESSAGE: 'Email address must be at least 3 characters long',
    },
    MAX_LENGTH: {
      VALUE: 256,
      ERROR_MESSAGE: 'Email address must be at most 256 characters long',
    },
  },
  PASSWORD: {
    INVALID_TYPE_ERROR_MESSAGE: 'Password must be a string',
    REQUIRED_ERROR_MESSAGE: 'Password is required',
    MIN_LENGTH: {
      VALUE: 4,
      ERROR_MESSAGE: 'Password must be at least 4 characters long',
    },
    MAX_LENGTH: {
      VALUE: 64,
      ERROR_MESSAGE: 'Password must be at most 64 characters long',
    },
  },
} as const;

const AUTHENTICATION_SCHEMAS = {
  LOGIN: zod.object(
    {
      email: zod
        .string({
          invalid_type_error: USER.EMAIL.INVALID_TYPE_ERROR_MESSAGE,
          required_error: USER.EMAIL.REQUIRED_ERROR_MESSAGE,
        })
        .min(USER.EMAIL.MIN_LENGTH.VALUE, USER.EMAIL.MIN_LENGTH.ERROR_MESSAGE)
        .max(USER.EMAIL.MAX_LENGTH.VALUE, USER.EMAIL.MAX_LENGTH.ERROR_MESSAGE)
        .email(USER.EMAIL.ERROR_MESSAGE),
      password: zod
        .string({
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
  ),
  REFRESH: zod.object(
    {
      refreshToken: zod
        .string({
          invalid_type_error:
            AUTHENTICATION.REFRESH.TOKEN.INVALID_TYPE_ERROR_MESSAGE,
          required_error: AUTHENTICATION.REFRESH.TOKEN.REQUIRED_ERROR_MESSAGE,
        })
        .jwt({
          message: AUTHENTICATION.REFRESH.TOKEN.ERROR_MESSAGE,
        }),
    },
    {
      invalid_type_error: BODY.INVALID_TYPE_ERROR_MESSAGE,
      required_error: BODY.REQUIRED_ERROR_MESSAGE,
    },
  ),
} as const;

/**********************************************************************************/

function validateLogin(request: Request) {
  const validatedResult = parseValidationResult(
    AUTHENTICATION_SCHEMAS.LOGIN.safeParse(request.body),
  );

  return validatedResult;
}

function validateRefreshAccessToken(request: Request) {
  const validatedResult = parseValidationResult(
    AUTHENTICATION_SCHEMAS.REFRESH.safeParse(request.body),
  );

  return validatedResult;
}

/**********************************************************************************/

export { AUTHENTICATION, validateLogin, validateRefreshAccessToken };
