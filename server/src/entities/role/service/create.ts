import type { Locals } from 'express';

import {
  possibleDuplicationError,
  type CreateRoleValidatedData,
  type Role,
} from './utils.ts';

/**********************************************************************************/

async function createRole(
  context: Locals,
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
    throw possibleDuplicationError(error, roleToCreate.name);
  }
}

/**********************************************************************************/

export { createRole };
