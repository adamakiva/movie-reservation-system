import {
  HTTP_STATUS_CODES,
  MRSError,
  type RequestContext,
  count,
  eq,
} from '../../../utils/index.js';

import type { DeleteRoleValidatedData } from './utils.js';

/**********************************************************************************/

async function deleteRole(
  context: RequestContext,
  roleId: DeleteRoleValidatedData,
): Promise<void> {
  await deleteRoleFromDatabase(context.database, roleId);
}

/**********************************************************************************/

async function deleteRoleFromDatabase(
  database: RequestContext['database'],
  roleId: DeleteRoleValidatedData,
) {
  const handler = database.getHandler();
  const { role: roleModel, user: userModel } = database.getModels();

  // Only roles without attached users are allowed to be deleted
  const usersWithDeletedRole = (
    await handler
      .select({ count: count() })
      .from(userModel)
      .where(eq(userModel.roleId, roleId))
  )[0]!.count;
  if (usersWithDeletedRole) {
    throw new MRSError(
      HTTP_STATUS_CODES.BAD_REQUEST,
      'Role has attached users',
    );
  }

  // I've decided that if nothing was deleted because it didn't exist in the
  // first place, it is still considered as a success since the end result
  // is the same
  await handler.delete(roleModel).where(eq(roleModel.id, roleId));
}

/**********************************************************************************/

export { deleteRole };
