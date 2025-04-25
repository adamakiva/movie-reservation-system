import { eq } from 'drizzle-orm';

import type { RequestContext } from '../../../utils/types.ts';

import {
  type DeleteUserValidatedData,
  handlePossibleForeignKeyError,
} from './utils.ts';

/**********************************************************************************/

async function deleteUser(
  context: RequestContext,
  userId: DeleteUserValidatedData,
): Promise<void> {
  const { database } = context;

  const handler = database.getHandler();
  const { user: userModel } = database.getModels();

  try {
    await handler.delete(userModel).where(eq(userModel.id, userId));
  } catch (error) {
    throw handlePossibleForeignKeyError(error, userId);
  }
}

/**********************************************************************************/

export { deleteUser };
