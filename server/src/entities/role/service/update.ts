import { HTTP_STATUS_CODES } from '@adamakiva/movie-reservation-system-shared';
import { eq } from 'drizzle-orm';

import { type RequestContext, GeneralError } from '../../../utils/index.ts';

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
  const { roleId, ...fieldsToUpdate } = roleToUpdate;

  const handler = database.getHandler();
  const { role: roleModel } = database.getModels();

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
  } catch (error) {
    // If there is a conflict it is due to the name update, hence, the name
    // field must exist
    throw handlePossibleDuplicationError(error, fieldsToUpdate.name!);
  }
}

/**********************************************************************************/

export { updateRole };
