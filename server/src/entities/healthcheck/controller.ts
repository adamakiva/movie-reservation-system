import { HTTP_STATUS_CODES } from '@adamakiva/movie-reservation-system-shared';
import type { Request } from 'express';

import type { RequestContext, ResponseWithContext } from '../../utils/types.ts';

import * as healthCheckValidator from './validator.ts';

/**********************************************************************************/

async function livenessHealthCheck(
  request: Request,
  response: ResponseWithContext,
) {
  healthCheckValidator.validateHealthCheck(request, response);

  const notAliveMessage = await isAlive(response.locals.context);
  if (notAliveMessage) {
    response
      .status(HTTP_STATUS_CODES.GATEWAY_TIMEOUT)
      .json(`Application is not alive: ${notAliveMessage}`);
    return;
  }

  response.status(HTTP_STATUS_CODES.NO_CONTENT).end();
}

async function readinessHealthCheck(
  request: Request,
  response: ResponseWithContext,
) {
  healthCheckValidator.validateHealthCheck(request, response);

  const notReadyMsg = await isReady(response.locals.context);
  if (notReadyMsg) {
    response
      .status(HTTP_STATUS_CODES.GATEWAY_TIMEOUT)
      .json(`Application is not ready: ${notReadyMsg}`);
    return;
  }

  response.status(HTTP_STATUS_CODES.NO_CONTENT).end();
}

/**********************************************************************************/

async function isAlive(context: RequestContext) {
  const { database, messageQueue, logger } = context;

  let notAliveMessage = '';
  try {
    await database.isAlive();
  } catch (error) {
    logger.error(error);
    notAliveMessage += '\nDatabase is not alive';
  }
  try {
    messageQueue.isAlive();
  } catch (error) {
    logger.error(error);
    notAliveMessage += '\nMessage queue is not alive';
  }

  return notAliveMessage;
}

async function isReady(context: RequestContext) {
  const { database, messageQueue, logger } = context;

  let notReadyMsg = '';
  try {
    await database.isReady();
  } catch (error) {
    logger.error(error);
    notReadyMsg += '\nDatabase is not ready';
  }
  try {
    messageQueue.isReady();
  } catch (error) {
    logger.error(error);
    notReadyMsg += '\nMessage queue is not ready';
  }

  return notReadyMsg;
}

/**********************************************************************************/

export { livenessHealthCheck, readinessHealthCheck };
