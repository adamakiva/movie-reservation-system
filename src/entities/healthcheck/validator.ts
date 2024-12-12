import {
  type Request,
  type ResponseWithCtx,
  HTTP_STATUS_CODES,
} from '../../utils/index.js';

import {
  healthCheckSchema,
  parseValidationResult,
  VALIDATION,
} from '../utils.validator.js';

/**********************************************************************************/

const {
  HEALTHCHECK: {
    HTTP_METHODS: { NAMES: ALLOWED_METHODS },
  },
} = VALIDATION;

/**********************************************************************************/

function validateHealthCheck(req: Request, res: ResponseWithCtx) {
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
    res.set('Allow', Array.from(ALLOWED_METHODS).join(', '));

    throw err;
  }
}

/**********************************************************************************/

export { validateHealthCheck };
