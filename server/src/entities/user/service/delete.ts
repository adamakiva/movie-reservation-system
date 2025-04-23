import { eq } from 'drizzle-orm';

import type { RequestContext } from '../../../utils/types.ts';

import {
  type DeleteUserValidatedData,
  handlePossibleRestrictError,
} from './utils.ts';

/**********************************************************************************/

async function deleteUser(
  context: RequestContext,
  userId: DeleteUserValidatedData,
): Promise<void> {
  const { database } = context;

  const handler = database.getHandler();
  const { user: userModel } = database.getModels();

  // I've decided that if nothing was deleted because it didn't exist in the
  // first place, it is still considered as a success since the end result
  // is the same
  try {
    await handler.delete(userModel).where(eq(userModel.id, userId));
  } catch (error) {
    throw handlePossibleRestrictError(error, userId);
  }
}

/**********************************************************************************/

export { deleteUser };
