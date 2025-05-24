import type { Locals } from 'express';

import {
  type CreateHallValidatedData,
  type Hall,
  possibleDuplicationError,
} from './utils.ts';

/**********************************************************************************/

async function createHall(
  context: Locals,
  hallToCreate: CreateHallValidatedData,
): Promise<Hall> {
  const { database } = context;

  const handler = database.getHandler();
  const { hall: hallModel } = database.getModels();

  try {
    const [createdHall] = await handler
      .insert(hallModel)
      .values(hallToCreate)
      .returning({
        id: hallModel.id,
        name: hallModel.name,
        rows: hallModel.rows,
        columns: hallModel.columns,
      });

    return createdHall!;
  } catch (error) {
    throw possibleDuplicationError(error, hallToCreate.name);
  }
}

/*********************************************************************************/

export { createHall };
