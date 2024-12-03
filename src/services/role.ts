import {
  HTTP_STATUS_CODES,
  MRSError,
  type RequestContext,
  asc,
  eq,
} from '../utils/index.js';

import type {
  validateCreateRole,
  validateDeleteRole,
  validateUpdateRole,
} from '../validators/role.js';

/**********************************************************************************/

type CreateRoleValidatedData = ReturnType<typeof validateCreateRole>;
type UpdateRoleValidatedData = ReturnType<typeof validateUpdateRole>;
type DeleteRoleValidatedData = ReturnType<typeof validateDeleteRole>;

/**********************************************************************************/

async function getRoles(context: RequestContext) {
  const { database } = context;
  const handler = database.getHandler();
  const { role: roleModel } = database.getModels();

  return await handler
    .select({ id: roleModel.id, name: roleModel.name })
    .from(roleModel)
    .orderBy(asc(roleModel.name));
}

async function createRole(
  context: RequestContext,
  roleToCreate: CreateRoleValidatedData,
) {
  const { database } = context;
  const handler = database.getHandler();
  const { role: roleModel } = database.getModels();

  return (
    await handler
      .insert(roleModel)
      .values(roleToCreate)
      .returning({ id: roleModel.id, name: roleModel.name })
  )[0]!;
}

async function updateRole(
  context: RequestContext,
  roleToUpdate: UpdateRoleValidatedData,
) {
  const { database } = context;
  const handler = database.getHandler();
  const { role: roleModel } = database.getModels();
  const { roleId, ...fieldsToUpdate } = roleToUpdate;

  const updatedRoles = await handler
    .update(roleModel)
    .set(fieldsToUpdate)
    .where(eq(roleModel.id, roleId))
    .returning({ id: roleModel.id, name: roleModel.name });
  if (!updatedRoles.length) {
    throw new MRSError(HTTP_STATUS_CODES.NOT_FOUND, 'Role does not exist');
  }

  return updatedRoles[0]!;
}

async function deleteRole(
  context: RequestContext,
  roleId: DeleteRoleValidatedData,
) {
  const { database } = context;
  const handler = database.getHandler();
  const { role: roleModel } = database.getModels();

  await handler.delete(roleModel).where(eq(roleModel.id, roleId));
}

/**********************************************************************************/

export { createRole, deleteRole, getRoles, updateRole };
