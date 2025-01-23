import { eq } from 'drizzle-orm';

import type { RequestContext } from '../../../utils/index.js';

import type { DeleteUserValidatedData } from './utils.js';

/**********************************************************************************/

async function deleteUser(
  context: RequestContext,
  userId: DeleteUserValidatedData,
): Promise<void> {
  await deleteUserFromDatabase(context.database, userId);
}

/**********************************************************************************/

async function deleteUserFromDatabase(
  database: RequestContext['database'],
  userId: DeleteUserValidatedData,
) {
  const handler = database.getHandler();
  const { user: userModel } = database.getModels();

  // I've decided that if nothing was deleted because it didn't exist in the
  // first place, it is still considered as a success since the end result
  // is the same
  await handler.delete(userModel).where(eq(userModel.id, userId));
}

/**********************************************************************************/

export { deleteUser };
