import { count, eq } from 'drizzle-orm';

import {
  GeneralError,
  HTTP_STATUS_CODES,
  type RequestContext,
} from '../../../utils/index.js';

import type { DeleteRoleValidatedData } from './utils.js';

/**********************************************************************************/

async function deleteRole(
  context: RequestContext,
  roleId: DeleteRoleValidatedData,
): Promise<void> {
  const { database } = context;
  const handler = database.getHandler();
  const { role: roleModel, user: userModel } = database.getModels();

  // Not using a CTE because we won't be to tell whether nothing was deleted due
  // to having an attached movie or because it does not exist
  await handler.transaction(async (transaction) => {
    // Only roles without attached users are allowed to be deleted
    const usersWithDeletedRole = (
      await transaction
        .select({ count: count() })
        .from(userModel)
        .where(eq(userModel.roleId, roleId))
    )[0]!.count;
    if (usersWithDeletedRole) {
      throw new GeneralError(
        HTTP_STATUS_CODES.BAD_REQUEST,
        'Role has attached users',
      );
    }

    // I've decided that if nothing was deleted because it didn't exist in the
    // first place, it is still considered as a success since the end result
    // is the same
    await transaction.delete(roleModel).where(eq(roleModel.id, roleId));
  });
}

/**********************************************************************************/

export { deleteRole };
