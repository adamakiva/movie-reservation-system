import type { Request } from 'express';
import { enum as ZodEnum, string as ZodString } from 'zod';

import {
  HTTP_STATUS_CODES,
  type ResponseWithContext,
} from '../../utils/index.js';

import { parseValidationResult, VALIDATION } from '../utils.validator.js';

/**********************************************************************************/

const { HEALTHCHECK } = VALIDATION;

/**********************************************************************************/

const healthCheckSchema = ZodString({
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
    ZodEnum(HEALTHCHECK.HTTP_METHODS.NAMES, {
      errorMap: () => {
        return {
          message: HEALTHCHECK.HTTP_METHODS.ERROR_MESSAGE,
        } as const;
      },
    }),
  );

/**********************************************************************************/

function validateHealthCheck(req: Request, res: ResponseWithContext) {
  try {
    const { method } = req;

    const validatedResult = healthCheckSchema.safeParse(method);
    const parsedValidatedResult = parseValidationResult(
      validatedResult,
      HTTP_STATUS_CODES.NOT_ALLOWED,
    );

    return parsedValidatedResult;
  } catch (err) {
    // When returning 405 you **must** supply the Allow header.
    // See: https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/405
    res.set('Allow', Array.from(HEALTHCHECK.HTTP_METHODS.NAMES).join(', '));

    throw err;
  }
}

/**********************************************************************************/

export { validateHealthCheck };
