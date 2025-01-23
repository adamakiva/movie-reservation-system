import type { RequestContext } from '../../../utils/index.js';

import {
  type CreateHallValidatedData,
  type Hall,
  handlePossibleDuplicationError,
} from './utils.js';

/**********************************************************************************/

async function createHall(
  context: RequestContext,
  hallToCreate: CreateHallValidatedData,
): Promise<Hall> {
  const createdHall = await insertHallToDatabase(
    context.database,
    hallToCreate,
  );

  return createdHall;
}

/**********************************************************************************/

async function insertHallToDatabase(
  database: RequestContext['database'],
  hallToCreate: CreateHallValidatedData,
) {
  const handler = database.getHandler();
  const { hall: hallModel } = database.getModels();

  try {
    const createdHall = (
      await handler
        .insert(hallModel)
        .values(hallToCreate)
        .returning({
          id: hallModel.id,
          name: hallModel.name,
          rows: hallModel.rows,
          columns: hallModel.columns,
        })
    )[0]!;

    return createdHall;
  } catch (err) {
    throw handlePossibleDuplicationError(err, hallToCreate.name);
  }
}

/*********************************************************************************/

export { createHall };
