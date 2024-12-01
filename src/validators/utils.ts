import { MRSError, Zod } from '../utils/index.js';

/**********************************************************************************/

const VALIDATION = {
  HEALTHCHECK: {
    HTTP_METHODS: {
      NAMES: ['HEAD', 'GET'],
      ERROR_MESSAGE: `HTTP method must be one of 'HEAD', 'GET'`,
      INVALID_TYPE_ERROR_MESSAGE: 'HTTP method must be a string',
      REQUIRED_ERROR_MESSAGE: 'HTTP method is required',
      MIN_LENGTH: {
        VALUE: 3,
        ERROR_MESSAGE: 'HTTP method must be at least 3 characters long',
      },
      MAX_LENGTH: {
        VALUE: 4,
        ERROR_MESSAGE: 'HTTP method must be at most 4 characters long',
      },
    },
  },
  AUTHENTICATION: {
    LOGIN: {
      INVALID_TYPE_ERROR_MESSAGE: 'Request body should be an object',
      REQUIRED_ERROR_MESSAGE: 'Request must have a body',
      EMAIL: {
        ERROR_MESSAGE: 'Invalid email address',
        INVALID_TYPE_ERROR_MESSAGE: 'Email must be a string',
        REQUIRED_ERROR_MESSAGE: 'Email is required',
        MAX_LENGTH: {
          VALUE: 256,
          ERROR_MESSAGE: 'Email must be at most 256 characters long',
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
    },
    REFRESH: {
      INVALID_TYPE_ERROR_MESSAGE: 'Request body should be an object',
      REQUIRED_ERROR_MESSAGE: 'Request must have a body',
      TOKEN: {
        INVALID_TYPE_ERROR_MESSAGE: 'Refresh token must be a string',
        REQUIRED_ERROR_MESSAGE: 'Refresh token is required',
        MAX_LENGTH: {
          VALUE: 1_024,
          ERROR_MESSAGE: 'Refresh token must be at most 1024 characters long',
        },
      },
    },
  },
} as const;

const { HEALTHCHECK, AUTHENTICATION } = VALIDATION;

/**********************************************************************************/

function parseValidationResult<I, O>(
  res: Zod.SafeParseReturnType<I, O>,
  statusCode: number,
) {
  if (!res.success) {
    const errorMessages = res.error.errors
      .map((err) => {
        return err.message;
      })
      .join(', ');

    throw new MRSError(statusCode, errorMessages, res.error.cause);
  }

  return res.data;
}

/**********************************************************************************/

const healthCheckSchema = Zod.string({
  invalid_type_error: HEALTHCHECK.HTTP_METHODS.INVALID_TYPE_ERROR_MESSAGE,
  required_error: HEALTHCHECK.HTTP_METHODS.REQUIRED_ERROR_MESSAGE,
})
  .min(
    HEALTHCHECK.HTTP_METHODS.MIN_LENGTH.VALUE,
    HEALTHCHECK.HTTP_METHODS.MIN_LENGTH.ERROR_MESSAGE,
  )
  .max(
    HEALTHCHECK.HTTP_METHODS.MAX_LENGTH.VALUE,
    HEALTHCHECK.HTTP_METHODS.MAX_LENGTH.ERROR_MESSAGE,
  )
  .toUpperCase()
  .pipe(
    Zod.enum(HEALTHCHECK.HTTP_METHODS.NAMES, {
      errorMap: () => {
        return {
          message: HEALTHCHECK.HTTP_METHODS.ERROR_MESSAGE,
        };
      },
    }),
  );

/**********************************************************************************/

const loginSchema = Zod.object(
  {
    email: Zod.string({
      invalid_type_error: AUTHENTICATION.LOGIN.EMAIL.INVALID_TYPE_ERROR_MESSAGE,
      required_error: AUTHENTICATION.LOGIN.EMAIL.REQUIRED_ERROR_MESSAGE,
    })
      .max(
        AUTHENTICATION.LOGIN.EMAIL.MAX_LENGTH.VALUE,
        AUTHENTICATION.LOGIN.EMAIL.MAX_LENGTH.ERROR_MESSAGE,
      )
      .email(AUTHENTICATION.LOGIN.EMAIL.ERROR_MESSAGE),
    password: Zod.string({
      invalid_type_error:
        AUTHENTICATION.LOGIN.PASSWORD.INVALID_TYPE_ERROR_MESSAGE,
      required_error: AUTHENTICATION.LOGIN.PASSWORD.REQUIRED_ERROR_MESSAGE,
    })
      .min(
        AUTHENTICATION.LOGIN.PASSWORD.MIN_LENGTH.VALUE,
        AUTHENTICATION.LOGIN.PASSWORD.MIN_LENGTH.ERROR_MESSAGE,
      )
      .max(
        AUTHENTICATION.LOGIN.PASSWORD.MAX_LENGTH.VALUE,
        AUTHENTICATION.LOGIN.PASSWORD.MAX_LENGTH.ERROR_MESSAGE,
      ),
  },
  {
    invalid_type_error: AUTHENTICATION.LOGIN.INVALID_TYPE_ERROR_MESSAGE,
    required_error: AUTHENTICATION.LOGIN.REQUIRED_ERROR_MESSAGE,
  },
);

const refreshTokenSchema = Zod.object(
  {
    refreshToken: Zod.string({
      invalid_type_error:
        AUTHENTICATION.REFRESH.TOKEN.INVALID_TYPE_ERROR_MESSAGE,
      required_error: AUTHENTICATION.REFRESH.TOKEN.REQUIRED_ERROR_MESSAGE,
    }).max(
      AUTHENTICATION.REFRESH.TOKEN.MAX_LENGTH.VALUE,
      AUTHENTICATION.REFRESH.TOKEN.MAX_LENGTH.ERROR_MESSAGE,
    ),
  },
  {
    invalid_type_error: AUTHENTICATION.REFRESH.INVALID_TYPE_ERROR_MESSAGE,
    required_error: AUTHENTICATION.REFRESH.REQUIRED_ERROR_MESSAGE,
  },
);

/**********************************************************************************/

export {
  healthCheckSchema,
  loginSchema,
  parseValidationResult,
  refreshTokenSchema,
  VALIDATION,
};
