import type { RequestContext } from '../../../utils/index.js';

import * as utils from './utils.js';

/**********************************************************************************/

async function getRoles(context: RequestContext): Promise<utils.Role[]> {
  const roles = await utils.readRolesFromDatabase(context.database);

  return roles;
}

async function createRole(
  context: RequestContext,
  roleToCreate: utils.CreateRoleValidatedData,
): Promise<utils.Role> {
  const createdRole = await utils.insertRoleToDatabase(
    context.database,
    roleToCreate,
  );

  return createdRole;
}

async function updateRole(
  context: RequestContext,
  roleToUpdate: utils.UpdateRoleValidatedData,
): Promise<utils.Role> {
  const updatedRole = await utils.updateRoleInDatabase(
    context.database,
    roleToUpdate,
  );

  return updatedRole;
}

async function deleteRole(
  context: RequestContext,
  roleId: utils.DeleteRoleValidatedData,
): Promise<void> {
  await utils.deleteRoleFromDatabase(context.database, roleId);
}

/**********************************************************************************/

export { createRole, deleteRole, getRoles, updateRole };
