import type { Request } from 'express';

import {
  HTTP_STATUS_CODES,
  type ResponseWithContext,
} from '../../utils/index.ts';

import {
  parseValidationResult,
  SCHEMAS,
  VALIDATION,
} from '../utils.validator.ts';

/**********************************************************************************/

const { HEALTHCHECK } = SCHEMAS;
const {
  HEALTHCHECK: { HTTP_METHODS },
} = VALIDATION;

/**********************************************************************************/

function validateHealthCheck(req: Request, res: ResponseWithContext) {
  try {
    const { method } = req;

    const validatedResult = HEALTHCHECK.safeParse(method);
    const parsedValidatedResult = parseValidationResult(
      validatedResult,
      HTTP_STATUS_CODES.NOT_ALLOWED,
    );

    return parsedValidatedResult;
  } catch (err) {
    // When returning 405 you **must** supply the Allow header.
    // See: https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/405
    res.set('Allow', Array.from(HTTP_METHODS.NAMES).join(', '));

    throw err;
  }
}

/**********************************************************************************/

export { validateHealthCheck };
