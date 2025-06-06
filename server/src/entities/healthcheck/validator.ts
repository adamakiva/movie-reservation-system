import { HTTP_STATUS_CODES } from '@adamakiva/movie-reservation-system-shared';
import type { Request, Response } from 'express';
import zod from 'zod';

import { parseValidationResult } from '../utils.ts';

/**********************************************************************************/

const HEALTHCHECK = {
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
} as const;

const HEALTHCHECK_SCHEMA = zod
  .string({
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
    zod.enum(HEALTHCHECK.HTTP_METHODS.NAMES, {
      errorMap: () => {
        return {
          message: HEALTHCHECK.HTTP_METHODS.ERROR_MESSAGE,
        } as const;
      },
    }),
  );

/**********************************************************************************/

function validateHealthCheck(request: Request, response: Response) {
  try {
    const validatedResult = parseValidationResult(
      HEALTHCHECK_SCHEMA.safeParse(request.method),
      HTTP_STATUS_CODES.NOT_ALLOWED,
    );

    return validatedResult;
  } catch (error) {
    // When returning 405 you **must** supply the Allow header.
    // See: https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/405
    response.set('Allow', HEALTHCHECK.HTTP_METHODS.NAMES.join(', '));

    throw error;
  }
}

/**********************************************************************************/

export { validateHealthCheck };
