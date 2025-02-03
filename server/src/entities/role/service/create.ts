import type { RequestContext } from '../../../utils/index.ts';

import {
  type CreateRoleValidatedData,
  handlePossibleDuplicationError,
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
  } catch (err) {
    throw handlePossibleDuplicationError(err, roleToCreate.name);
  }
}

/**********************************************************************************/

export { createRole };
