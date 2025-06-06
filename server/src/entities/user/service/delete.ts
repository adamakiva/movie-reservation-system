import { eq } from 'drizzle-orm';
import type { Locals } from 'express';

import {
  type DeleteUserValidatedData,
  possibleForeignKeyError,
} from './utils.ts';

/**********************************************************************************/

async function deleteUser(
  context: Locals,
  userId: DeleteUserValidatedData,
): Promise<void> {
  const { database } = context;

  const handler = database.getHandler();
  const { user: userModel } = database.getModels();

  try {
    await handler.delete(userModel).where(eq(userModel.id, userId));
  } catch (error) {
    throw possibleForeignKeyError(error, userId);
  }
}

/**********************************************************************************/

export { deleteUser };
