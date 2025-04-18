import type { RequestContext } from '../../../utils/types.ts';

import {
  handlePossibleDuplicationError,
  type CreateRoleValidatedData,
  type Role,
} from './utils.ts';

/**********************************************************************************/

async function createRole(
  context: RequestContext,
  roleToCreate: CreateRoleValidatedData,
): Promise<Role> {
  const { database } = context;

  const handler = database.getHandler();
  const { role: roleModel } = database.getModels();

  try {
    const [createdRole] = await handler
      .insert(roleModel)
      .values(roleToCreate)
      .returning({ id: roleModel.id, name: roleModel.name });

    return createdRole!;
  } catch (error) {
    throw handlePossibleDuplicationError(error, roleToCreate.name);
  }
}

/**********************************************************************************/

export { createRole };
