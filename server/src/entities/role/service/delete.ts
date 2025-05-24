import { eq } from 'drizzle-orm';
import type { Locals } from 'express';

import {
  type DeleteRoleValidatedData,
  possibleForeignKeyError,
} from './utils.ts';

/**********************************************************************************/

async function deleteRole(
  context: Locals,
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
