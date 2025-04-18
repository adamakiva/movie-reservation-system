import { HTTP_STATUS_CODES } from '@adamakiva/movie-reservation-system-shared';
import type { Request } from 'express';

import type { ResponseWithContext } from '../../utils/types.ts';

import * as hallService from './service/index.ts';
import * as hallValidator from './validator.ts';

/**********************************************************************************/

async function getHalls(_: Request, response: ResponseWithContext) {
  const halls = await hallService.getHalls(response.locals.context);

  response.status(HTTP_STATUS_CODES.SUCCESS).json(halls);
}

async function createHall(request: Request, response: ResponseWithContext) {
  const hallToCreate = hallValidator.validateCreateHall(request);

  const createdHall = await hallService.createHall(
    response.locals.context,
    hallToCreate,
  );

  response.status(HTTP_STATUS_CODES.CREATED).json(createdHall);
}

async function updateHall(request: Request, response: ResponseWithContext) {
  const hallToUpdate = hallValidator.validateUpdateHall(request);

  const updatedHall = await hallService.updateHall(
    response.locals.context,
    hallToUpdate,
  );

  response.status(HTTP_STATUS_CODES.SUCCESS).json(updatedHall);
}

async function deleteHall(request: Request, response: ResponseWithContext) {
  const hallId = hallValidator.validateDeleteHall(request);

  await hallService.deleteHall(response.locals.context, hallId);

  response.status(HTTP_STATUS_CODES.NO_CONTENT).end();
}

/**********************************************************************************/

export { createHall, deleteHall, getHalls, updateHall };
