import type { Request } from 'express';

import { HTTP_STATUS_CODES } from '../utils/constants.js';
import type { ResponseWithCtx } from '../utils/index.js';
import {
  healthCheckSchema,
  parseValidationResult,
  VALIDATION,
} from './utils.js';

const {
  HEALTHCHECK: {
    HTTP_METHODS: { NAMES: ALLOWED_METHODS },
  },
} = VALIDATION;

/**********************************************************************************/

function validateHealthCheck(req: Request, res: ResponseWithCtx) {
  try {
    const { method } = req;

    return parseValidationResult(
      healthCheckSchema.safeParse(method),
      HTTP_STATUS_CODES.NOT_ALLOWED,
    );
  } catch (err) {
    // When returning 405 you **must** supply the Allow header.
    // See: https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/405
    res.set('Allow', Array.from(ALLOWED_METHODS).join(', '));

    throw err;
  }
}

/**********************************************************************************/

export { validateHealthCheck };
