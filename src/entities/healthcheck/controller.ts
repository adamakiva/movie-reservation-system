import {
  type Request,
  type RequestContext,
  type ResponseWithCtx,
  HTTP_STATUS_CODES,
} from '../../utils/index.js';

import * as healthCheckValidator from './validator.js';

/**********************************************************************************/

function livenessHealthCheck(req: Request, res: ResponseWithCtx) {
  healthCheckValidator.validateHealthCheck(req, res);

  res.status(HTTP_STATUS_CODES.NO_CONTENT).end();
}

async function readinessHealthCheck(req: Request, res: ResponseWithCtx) {
  healthCheckValidator.validateHealthCheck(req, res);

  const notReadyMsg = await isReady(res.locals.context);
  if (notReadyMsg.length) {
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
