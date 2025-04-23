import { eq } from 'drizzle-orm';

import type { RequestContext } from '../../../utils/types.ts';

import {
  type DeleteRoleValidatedData,
  handlePossibleRestrictError,
} from './utils.ts';

/**********************************************************************************/

async function deleteRole(
  context: RequestContext,
  roleId: DeleteRoleValidatedData,
): Promise<void> {
  const { database } = context;

  const handler = database.getHandler();
  const { role: roleModel } = database.getModels();

  // I've decided that if nothing was deleted because it didn't exist in the
  // first place, it is still considered as a success since the end result
  // is the same
  try {
    await handler.delete(roleModel).where(eq(roleModel.id, roleId));
  } catch (error) {
    throw handlePossibleRestrictError(error, roleId);
  }
}

/**********************************************************************************/

export { deleteRole };
