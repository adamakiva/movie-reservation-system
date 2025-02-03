import { eq } from 'drizzle-orm';

import {
  type RequestContext,
  GeneralError,
  HTTP_STATUS_CODES,
} from '../../../utils/index.ts';

import {
  type Role,
  type UpdateRoleValidatedData,
  handlePossibleDuplicationError,
} from './utils.ts';

/**********************************************************************************/

async function updateRole(
  context: RequestContext,
  roleToUpdate: UpdateRoleValidatedData,
): Promise<Role> {
  const { database } = context;
  const handler = database.getHandler();
  const { role: roleModel } = database.getModels();
  const { roleId, ...fieldsToUpdate } = roleToUpdate;

  try {
    const [updatedRole] = await handler
      .update(roleModel)
      .set({ ...fieldsToUpdate, updatedAt: new Date() })
      .where(eq(roleModel.id, roleId))
      .returning({ id: roleModel.id, name: roleModel.name });
    if (!updatedRole) {
      throw new GeneralError(
        HTTP_STATUS_CODES.NOT_FOUND,
        `Role '${roleId}' does not exist`,
      );
    }

    return updatedRole;
  } catch (err) {
    // If there is a conflict it is due to the name update, hence, the name
    // field must exist
    throw handlePossibleDuplicationError(err, fieldsToUpdate.name!);
  }
}

/**********************************************************************************/

export { updateRole };
