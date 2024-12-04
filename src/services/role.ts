import {
  asc,
  eq,
  ERROR_CODES,
  HTTP_STATUS_CODES,
  MRSError,
  pg,
  type RemoveUndefinedFields,
  type RequestContext,
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

  try {
    // After insertion the value exists
    return (
      await handler
        .insert(roleModel)
        .values(roleToCreate)
        .returning({ id: roleModel.id, name: roleModel.name })
    )[0]!;
  } catch (err) {
    throw handlePossibleDuplicationError(err, roleToCreate.name);
  }
}

async function updateRole(
  context: RequestContext,
  roleToUpdate: UpdateRoleValidatedData,
) {
  const { database } = context;
  const handler = database.getHandler();
  const { role: roleModel } = database.getModels();
  const { roleId, ...fieldsToUpdate } = roleToUpdate;

  try {
    // Since name is the only field we can assert it being not undefined.
    // If more fields are added, this will need to be re-evaluated
    const updatedRoles = await handler
      .update(roleModel)
      .set(
        fieldsToUpdate as RemoveUndefinedFields<typeof fieldsToUpdate, 'name'>,
      )
      .where(eq(roleModel.id, roleId))
      .returning({ id: roleModel.id, name: roleModel.name });
    if (!updatedRoles.length) {
      throw new MRSError(HTTP_STATUS_CODES.NOT_FOUND, 'Role does not exist');
    }

    // Updated role exists
    return updatedRoles[0]!;
  } catch (err) {
    // If there is a conflict it is due to the name update, hence, the name
    // field must exist
    throw handlePossibleDuplicationError(err, fieldsToUpdate.name!);
  }
}

async function deleteRole(
  context: RequestContext,
  roleId: DeleteRoleValidatedData,
) {
  const { database } = context;
  const handler = database.getHandler();
  const { role: roleModel } = database.getModels();

  // I decided that if nothing was deleted because it didn't exist in the
  // first place, it is still considered as a success since the end result
  // is the same
  await handler.delete(roleModel).where(eq(roleModel.id, roleId));
}

/**********************************************************************************/

function handlePossibleDuplicationError(err: unknown, conflictField: string) {
  if (
    err instanceof pg.PostgresError &&
    err.code === ERROR_CODES.POSTGRES.UNIQUE_VIOLATION
  ) {
    return new MRSError(
      HTTP_STATUS_CODES.CONFLICT,
      `Role '${conflictField}' already exists`,
      err.cause,
    );
  }

  return err;
}

/**********************************************************************************/

export { createRole, deleteRole, getRoles, updateRole };
