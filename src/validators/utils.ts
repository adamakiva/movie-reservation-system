import { MRSError, Zod } from '../utils/index.js';

/**********************************************************************************/

const VALIDATION = {
  HEALTHCHECK: {
    HTTP_METHODS: {
      NAMES: ['HEAD', 'GET'],
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
      EMAIL: {
        MAX_LENGTH: {
          VALUE: 256,
          ERROR_MESSAGE: 'Email must be at most 256 characters long',
        },
      },
      PASSWORD: {
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
      TOKEN: {
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

const prettifiedHttpMethods = HEALTHCHECK.HTTP_METHODS.NAMES.map((method) => {
  return `'${method}'`;
}).join(',');

const healthCheckSchema = Zod.string({
  invalid_type_error: 'HTTP method must be a string',
  required_error: 'HTTP method is required',
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
          message: `HTTP method must be one of ${prettifiedHttpMethods}`,
        };
      },
    }),
  );

/**********************************************************************************/

const loginSchema = Zod.object(
  {
    email: Zod.string({
      invalid_type_error: 'Email must be a string',
      required_error: 'Email is required',
    })
      .max(
        AUTHENTICATION.LOGIN.EMAIL.MAX_LENGTH.VALUE,
        AUTHENTICATION.LOGIN.EMAIL.MAX_LENGTH.ERROR_MESSAGE,
      )
      .email('Invalid email'),
    password: Zod.string({
      invalid_type_error: 'Password must be a string',
      required_error: 'Password is required',
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
    invalid_type_error: 'Request body should be an object',
    required_error: 'Request must have a body',
  },
);

const refreshTokenSchema = Zod.object({
  refreshToken: Zod.string({
    invalid_type_error: 'Refresh token must be a string',
    required_error: 'Refresh token is required',
  }).max(
    AUTHENTICATION.REFRESH.TOKEN.MAX_LENGTH.VALUE,
    AUTHENTICATION.REFRESH.TOKEN.MAX_LENGTH.ERROR_MESSAGE,
  ),
});

/**********************************************************************************/

export {
  healthCheckSchema,
  loginSchema,
  parseValidationResult,
  refreshTokenSchema,
  VALIDATION,
};
