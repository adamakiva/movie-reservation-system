import { eq } from 'drizzle-orm';

import {
  type RequestContext,
  HTTP_STATUS_CODES,
  MRSError,
} from '../../../utils/index.js';

import {
  type Role,
  type UpdateRoleValidatedData,
  handlePossibleDuplicationError,
} from './utils.js';

/**********************************************************************************/

async function updateRole(
  context: RequestContext,
  roleToUpdate: UpdateRoleValidatedData,
): Promise<Role> {
  const updatedRole = await updateRoleInDatabase(
    context.database,
    roleToUpdate,
  );

  return updatedRole;
}

/**********************************************************************************/

async function updateRoleInDatabase(
  database: RequestContext['database'],
  roleToUpdate: UpdateRoleValidatedData,
) {
  const handler = database.getHandler();
  const { role: roleModel } = database.getModels();
  const { roleId, ...fieldsToUpdate } = roleToUpdate;

  try {
    const updatedRoles = await handler
      .update(roleModel)
      .set({ ...fieldsToUpdate, updatedAt: new Date() })
      .where(eq(roleModel.id, roleId))
      .returning({ id: roleModel.id, name: roleModel.name });
    if (!updatedRoles.length) {
      throw new MRSError(
        HTTP_STATUS_CODES.NOT_FOUND,
        `Role '${roleId}' does not exist`,
      );
    }

    return updatedRoles[0]!;
  } catch (err) {
    // If there is a conflict it is due to the name update, hence, the name
    // field must exist
    throw handlePossibleDuplicationError(err, fieldsToUpdate.name!);
  }
}

/**********************************************************************************/

export { updateRole };
