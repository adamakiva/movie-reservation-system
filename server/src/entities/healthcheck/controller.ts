import { HTTP_STATUS_CODES } from '@adamakiva/movie-reservation-system-shared';
import type { Locals, Request, Response } from 'express';

import { GeneralError } from '../../utils/errors.ts';

import * as healthCheckValidator from './validator.ts';

/**********************************************************************************/

async function livenessHealthCheck(request: Request, response: Response) {
  healthCheckValidator.validateHealthCheck(request, response);

  const notAliveMessage = await isAlive(request.app.locals);
  if (notAliveMessage) {
    response
      .status(HTTP_STATUS_CODES.GATEWAY_TIMEOUT)
      .json(`Application is not alive: ${notAliveMessage}`);
    return;
  }

  response.status(HTTP_STATUS_CODES.NO_CONTENT).end();
}

async function readinessHealthCheck(request: Request, response: Response) {
  healthCheckValidator.validateHealthCheck(request, response);

  const notReadyMsg = await isReady(request.app.locals);
  if (notReadyMsg) {
    response
      .status(HTTP_STATUS_CODES.GATEWAY_TIMEOUT)
      .json(`Application is not ready: ${notReadyMsg}`);
    return;
  }

  response.status(HTTP_STATUS_CODES.NO_CONTENT).end();
}

/**********************************************************************************/

async function isAlive(context: Locals) {
  const { database, messageQueue, logger } = context;

  let notAliveMessage = '';
  try {
    await database.isAlive();
  } catch (error) {
    logger.warn(error);
    notAliveMessage += '\nDatabase is not alive';
  }
  try {
    if (!messageQueue.isAlive()) {
      throw new GeneralError(
        HTTP_STATUS_CODES.GATEWAY_TIMEOUT,
        'Message queue is not alive',
      );
    }
  } catch (error) {
    logger.warn(error);
    notAliveMessage += '\nMessage queue is not alive';
  }

  return notAliveMessage;
}

async function isReady(context: Locals) {
  const { database, messageQueue, logger } = context;

  let notReadyMsg = '';
  try {
    await database.isReady();
  } catch (error) {
    logger.warn(error);
    notReadyMsg += '\nDatabase is not ready';
  }
  try {
    if (!messageQueue.isReady()) {
      throw new GeneralError(
        HTTP_STATUS_CODES.GATEWAY_TIMEOUT,
        'Message queue is not ready',
      );
    }
  } catch (error) {
    logger.warn(error);
    notReadyMsg += '\nMessage queue is not ready';
  }

  return notReadyMsg;
}

/**********************************************************************************/

export { livenessHealthCheck, readinessHealthCheck };
