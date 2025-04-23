import { eq } from 'drizzle-orm';

import type { RequestContext } from '../../../utils/types.ts';

import {
  type DeleteHallValidatedData,
  handlePossibleRestrictError,
} from './utils.ts';

/**********************************************************************************/

async function deleteHall(
  context: RequestContext,
  hallId: DeleteHallValidatedData,
): Promise<void> {
  const { database } = context;

  const handler = database.getHandler();
  const { hall: hallModel } = database.getModels();

  // I've decided that if nothing was deleted because it didn't exist in the
  // first place, it is still considered as a success since the end result
  // is the same
  try {
    await handler.delete(hallModel).where(eq(hallModel.id, hallId));
  } catch (error) {
    throw handlePossibleRestrictError(error, hallId);
  }
}

/*********************************************************************************/

export { deleteHall };
