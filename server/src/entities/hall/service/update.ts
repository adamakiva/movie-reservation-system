import { HTTP_STATUS_CODES } from '@adamakiva/movie-reservation-system-shared';
import { eq } from 'drizzle-orm';

import { GeneralError, type RequestContext } from '../../../utils/index.ts';

import {
  type Hall,
  type UpdateHallValidatedData,
  handlePossibleDuplicationError,
} from './utils.ts';

/**********************************************************************************/

async function updateHall(
  context: RequestContext,
  hallToUpdate: UpdateHallValidatedData,
): Promise<Hall> {
  const { database } = context;
  const { hallId, ...fieldsToUpdate } = hallToUpdate;

  const handler = database.getHandler();
  const { hall: hallModel } = database.getModels();

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
  } catch (error) {
    // If there is a conflict it is due to the name update, hence, the name
    // field must exist
    throw handlePossibleDuplicationError(error, fieldsToUpdate.name!);
  }
}

/*********************************************************************************/

export { updateHall };
