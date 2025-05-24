import { eq } from 'drizzle-orm';
import type { Locals } from 'express';

import {
  type DeleteHallValidatedData,
  possibleForeignKeyError,
} from './utils.ts';

/**********************************************************************************/

async function deleteHall(
  context: Locals,
  hallId: DeleteHallValidatedData,
): Promise<void> {
  const { database } = context;

  const handler = database.getHandler();
  const { hall: hallModel } = database.getModels();

  try {
    await handler.delete(hallModel).where(eq(hallModel.id, hallId));
  } catch (error) {
    throw possibleForeignKeyError(error, hallId);
  }
}

/*********************************************************************************/

export { deleteHall };
