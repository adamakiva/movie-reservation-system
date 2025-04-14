import type { RequestContext } from '../../../utils/index.ts';

import {
  type CreateHallValidatedData,
  type Hall,
  handlePossibleDuplicationError,
} from './utils.ts';

/**********************************************************************************/

async function createHall(
  context: RequestContext,
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
  } catch (err) {
    throw handlePossibleDuplicationError(err, hallToCreate.name);
  }
}

/*********************************************************************************/

export { createHall };
