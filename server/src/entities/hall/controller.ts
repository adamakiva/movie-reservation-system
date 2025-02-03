import type { Request } from 'express';

import {
  HTTP_STATUS_CODES,
  type ResponseWithContext,
} from '../../utils/index.ts';

import * as hallService from './service/index.ts';
import * as hallValidator from './validator.ts';

/**********************************************************************************/

async function getHalls(_req: Request, res: ResponseWithContext) {
  const halls = await hallService.getHalls(res.locals.context);

  res.status(HTTP_STATUS_CODES.SUCCESS).json(halls);
}

async function createHall(req: Request, res: ResponseWithContext) {
  const hallToCreate = hallValidator.validateCreateHall(req);

  const createdHall = await hallService.createHall(
    res.locals.context,
    hallToCreate,
  );

  res.status(HTTP_STATUS_CODES.CREATED).json(createdHall);
}

async function updateHall(req: Request, res: ResponseWithContext) {
  const hallToUpdate = hallValidator.validateUpdateHall(req);

  const updatedHall = await hallService.updateHall(
    res.locals.context,
    hallToUpdate,
  );

  res.status(HTTP_STATUS_CODES.SUCCESS).json(updatedHall);
}

async function deleteHall(req: Request, res: ResponseWithContext) {
  const hallId = hallValidator.validateDeleteHall(req);

  await hallService.deleteHall(res.locals.context, hallId);

  res.status(HTTP_STATUS_CODES.NO_CONTENT).end();
}

/**********************************************************************************/

export { createHall, deleteHall, getHalls, updateHall };
