import type { NextFunction, Request } from 'express';

import {
  type RequestContext,
  type ResponseWithCtx,
  HTTP_STATUS_CODES,
} from '../utils/index.js';
import { healthCheckValidator } from '../validators/index.js';

/**********************************************************************************/

function livenessHealthCheck(
  req: Request,
  res: ResponseWithCtx,
  next: NextFunction,
) {
  try {
    healthCheckValidator.validateHealthCheck(req, res);

    res.status(HTTP_STATUS_CODES.NO_CONTENT).end();
  } catch (err) {
    next(err);
  }
}

async function readinessHealthCheck(
  req: Request,
  res: ResponseWithCtx,
  next: NextFunction,
) {
  try {
    healthCheckValidator.validateHealthCheck(req, res);

    const notReadyMsg = await isReady(res.locals.context);
    if (notReadyMsg.length) {
      res
        .status(HTTP_STATUS_CODES.GATEWAY_TIMEOUT)
        .json(`Application is not available: ${notReadyMsg}`);
      return;
    }

    res.status(HTTP_STATUS_CODES.NO_CONTENT).end();
  } catch (err) {
    next(err);
  }
}

/**********************************************************************************/

async function isReady(context: RequestContext) {
  const { database, logger } = context;

  let notReadyMsg = '';
  try {
    await database.isReady();
  } catch (err) {
    logger.error(err);
    notReadyMsg += '\nDatabase is unavailable';
  }

  return notReadyMsg;
}

/**********************************************************************************/

export { livenessHealthCheck, readinessHealthCheck };
