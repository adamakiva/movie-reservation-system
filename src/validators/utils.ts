import Zod from 'zod';

import { MRSError } from '../utils/index.js';

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
  } as const,
};

const { HEALTHCHECK } = VALIDATION;

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

/********************************************************************************/

export { healthCheckSchema, parseValidationResult, VALIDATION };
