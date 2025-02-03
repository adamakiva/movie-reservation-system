import type { Request } from 'express';

import {
  type RequestContext,
  type ResponseWithContext,
  HTTP_STATUS_CODES,
} from '../../utils/index.ts';

import * as healthCheckValidator from './validator.ts';

/**********************************************************************************/

function livenessHealthCheck(req: Request, res: ResponseWithContext) {
  healthCheckValidator.validateHealthCheck(req, res);

  res.status(HTTP_STATUS_CODES.NO_CONTENT).end();
}

async function readinessHealthCheck(req: Request, res: ResponseWithContext) {
  healthCheckValidator.validateHealthCheck(req, res);

  const notReadyMsg = await isReady(res.locals.context);
  if (notReadyMsg) {
    res
      .status(HTTP_STATUS_CODES.GATEWAY_TIMEOUT)
      .json(`Application is not available: ${notReadyMsg}`);
    return;
  }

  res.status(HTTP_STATUS_CODES.NO_CONTENT).end();
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
