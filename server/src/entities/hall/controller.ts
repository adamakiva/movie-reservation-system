import { HTTP_STATUS_CODES } from '@adamakiva/movie-reservation-system-shared';
import type { Request, Response } from 'express';

import * as hallService from './service/index.ts';
import * as hallValidator from './validator.ts';

/**********************************************************************************/

async function getHalls(request: Request, response: Response) {
  const halls = await hallService.getHalls(request.app.locals);

  response.status(HTTP_STATUS_CODES.SUCCESS).json(halls);
}

async function createHall(request: Request, response: Response) {
  const hallToCreate = hallValidator.validateCreateHall(request);

  const createdHall = await hallService.createHall(
    request.app.locals,
    hallToCreate,
  );

  response.status(HTTP_STATUS_CODES.CREATED).json(createdHall);
}

async function updateHall(request: Request, response: Response) {
  const hallToUpdate = hallValidator.validateUpdateHall(request);

  const updatedHall = await hallService.updateHall(
    request.app.locals,
    hallToUpdate,
  );

  response.status(HTTP_STATUS_CODES.SUCCESS).json(updatedHall);
}

async function deleteHall(request: Request, response: Response) {
  const { hallId } = hallValidator.validateDeleteHall(request);

  await hallService.deleteHall(request.app.locals, hallId);

  response.status(HTTP_STATUS_CODES.NO_CONTENT).end();
}

/**********************************************************************************/

export { createHall, deleteHall, getHalls, updateHall };
