import { HTTP_STATUS_CODES } from '@adamakiva/movie-reservation-system-shared';
import type { Request } from 'express';

import type { RequestContext, ResponseWithContext } from '../../utils/index.ts';

import * as healthCheckValidator from './validator.ts';

/**********************************************************************************/

async function livenessHealthCheck(req: Request, res: ResponseWithContext) {
  healthCheckValidator.validateHealthCheck(req, res);

  const notAliveMessage = await isAlive(res.locals.context);
  if (notAliveMessage) {
    res
      .status(HTTP_STATUS_CODES.GATEWAY_TIMEOUT)
      .json(`Application is not alive: ${notAliveMessage}`);
    return;
  }

  res.status(HTTP_STATUS_CODES.NO_CONTENT).end();
}

async function readinessHealthCheck(req: Request, res: ResponseWithContext) {
  healthCheckValidator.validateHealthCheck(req, res);

  const notReadyMsg = await isReady(res.locals.context);
  if (notReadyMsg) {
    res
      .status(HTTP_STATUS_CODES.GATEWAY_TIMEOUT)
      .json(`Application is not ready: ${notReadyMsg}`);
    return;
  }

  res.status(HTTP_STATUS_CODES.NO_CONTENT).end();
}

/**********************************************************************************/

async function isAlive(context: RequestContext) {
  const { database, messageQueue, logger } = context;

  let notAliveMessage = '';
  try {
    await database.isAlive();
  } catch (err) {
    logger.error(err);
    notAliveMessage += '\nDatabase is not alive';
  }
  try {
    messageQueue.isAlive();
  } catch (err) {
    logger.error(err);
    notAliveMessage += '\nMessage queue is not alive';
  }

  return notAliveMessage;
}

async function isReady(context: RequestContext) {
  const { database, messageQueue, logger } = context;

  let notReadyMsg = '';
  try {
    await database.isReady();
  } catch (err) {
    logger.error(err);
    notReadyMsg += '\nDatabase is not ready';
  }
  try {
    messageQueue.isReady();
  } catch (err) {
    logger.error(err);
    notReadyMsg += '\nMessage queue is not ready';
  }

  return notReadyMsg;
}

/**********************************************************************************/

export { livenessHealthCheck, readinessHealthCheck };
