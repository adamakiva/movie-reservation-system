import { HTTP_STATUS_CODES } from '@adamakiva/movie-reservation-system-shared';
import { eq } from 'drizzle-orm';

import { GeneralError } from '../../../utils/errors.ts';
import type { RequestContext } from '../../../utils/types.ts';

import {
  type Hall,
  type UpdateHallValidatedData,
  possibleDuplicationError,
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
    // If there is a conflict it is due to the name field, hence, the name
    // field can be asserted
    throw possibleDuplicationError(error, fieldsToUpdate.name!);
  }
}

/*********************************************************************************/

export { updateHall };
