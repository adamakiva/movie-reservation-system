import { eq } from 'drizzle-orm';

import {
  GeneralError,
  HTTP_STATUS_CODES,
  type RequestContext,
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
  const { database } = context;
  const handler = database.getHandler();
  const { hall: hallModel } = database.getModels();
  const { hallId, ...fieldsToUpdate } = hallToUpdate;

  try {
    const [updatedHall] = await handler
      .update(hallModel)
      .set({ ...fieldsToUpdate, updatedAt: new Date() })
      .where(eq(hallModel.id, hallId))
      .returning({
        id: hallModel.id,
        name: hallModel.name,
        rows: hallModel.rows,
        columns: hallModel.columns,
      });
    if (!updatedHall) {
      throw new GeneralError(
        HTTP_STATUS_CODES.NOT_FOUND,
        `Hall '${hallId}' does not exist`,
      );
    }

    return updatedHall;
  } catch (err) {
    // If there is a conflict it is due to the name update, hence, the name
    // field must exist
    throw handlePossibleDuplicationError(err, fieldsToUpdate.name!);
  }
}

/*********************************************************************************/

export { updateHall };
