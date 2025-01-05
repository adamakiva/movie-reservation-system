import type { RequestContext } from '../../../utils/index.js';

import {
  type CreateRoleValidatedData,
  handlePossibleDuplicationError,
  type Role,
} from './utils.js';

/**********************************************************************************/

async function createRole(
  context: RequestContext,
  roleToCreate: CreateRoleValidatedData,
): Promise<Role> {
  const createdRole = await insertRoleToDatabase(
    context.database,
    roleToCreate,
  );

  return createdRole;
}

/**********************************************************************************/

async function insertRoleToDatabase(
  database: RequestContext['database'],
  roleToCreate: CreateRoleValidatedData,
) {
  const handler = database.getHandler();
  const { role: roleModel } = database.getModels();

  try {
    const createdRole = (
      await handler
        .insert(roleModel)
        .values(roleToCreate)
        .returning({ id: roleModel.id, name: roleModel.name })
    )[0]!;

    return createdRole;
  } catch (err) {
    throw handlePossibleDuplicationError(err, roleToCreate.name);
  }
}

/**********************************************************************************/

export { createRole };
