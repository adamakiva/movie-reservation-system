import { eq } from 'drizzle-orm';

import type { RequestContext } from '../../../utils/types.ts';

import {
  type DeleteRoleValidatedData,
  possibleForeignKeyError,
} from './utils.ts';

/**********************************************************************************/

async function deleteRole(
  context: RequestContext,
  roleId: DeleteRoleValidatedData,
): Promise<void> {
  const { database } = context;

  const handler = database.getHandler();
  const { role: roleModel } = database.getModels();

  try {
    await handler.delete(roleModel).where(eq(roleModel.id, roleId));
  } catch (error) {
    throw possibleForeignKeyError(error, roleId);
  }
}

/**********************************************************************************/

export { deleteRole };
