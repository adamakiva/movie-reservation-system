import { eq } from 'drizzle-orm';

import type { RequestContext } from '../../../utils/types.ts';

import {
  type DeleteHallValidatedData,
  handlePossibleForeignKeyError,
} from './utils.ts';

/**********************************************************************************/

async function deleteHall(
  context: RequestContext,
  hallId: DeleteHallValidatedData,
): Promise<void> {
  const { database } = context;

  const handler = database.getHandler();
  const { hall: hallModel } = database.getModels();

  try {
    await handler.delete(hallModel).where(eq(hallModel.id, hallId));
  } catch (error) {
    throw handlePossibleForeignKeyError(error, hallId);
  }
}

/*********************************************************************************/

export { deleteHall };
