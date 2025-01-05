import {
  HTTP_STATUS_CODES,
  MRSError,
  type RequestContext,
  eq,
} from '../../../utils/index.js';

import {
  type Hall,
  type UpdateHallValidatedData,
  handlePossibleDuplicationError,
} from './utils.js';

/**********************************************************************************/

async function updateHall(
  context: RequestContext,
  hallToUpdate: UpdateHallValidatedData,
): Promise<Hall> {
  const updatedHall = await updateHallInDatabase(
    context.database,
    hallToUpdate,
  );

  return updatedHall;
}

/**********************************************************************************/

async function updateHallInDatabase(
  database: RequestContext['database'],
  hallToUpdate: UpdateHallValidatedData,
) {
  const handler = database.getHandler();
  const { hall: hallModel } = database.getModels();
  const { hallId, ...fieldsToUpdate } = hallToUpdate;

  try {
    const updatedHall = await handler
      .update(hallModel)
      .set({ ...fieldsToUpdate, updatedAt: new Date() })
      .where(eq(hallModel.id, hallId))
      .returning({
        id: hallModel.id,
        name: hallModel.name,
        rows: hallModel.rows,
        columns: hallModel.columns,
      });
    if (!updatedHall.length) {
      throw new MRSError(
        HTTP_STATUS_CODES.NOT_FOUND,
        `Hall '${hallId}' does not exist`,
      );
    }

    return updatedHall[0]!;
  } catch (err) {
    // If there is a conflict it is due to the name update, hence, the name
    // field must exist
    throw handlePossibleDuplicationError(err, fieldsToUpdate.name!);
  }
}

/*********************************************************************************/

export { updateHall };
