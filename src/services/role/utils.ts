import {
  asc,
  count,
  eq,
  ERROR_CODES,
  HTTP_STATUS_CODES,
  MRSError,
  pg,
  type RequestContext,
} from '../../utils/index.js';
import type { roleValidator as validator } from '../../validators/index.js';

/**********************************************************************************/

type CreateRoleValidatedData = ReturnType<typeof validator.validateCreateRole>;
type UpdateRoleValidatedData = ReturnType<typeof validator.validateUpdateRole>;
type DeleteRoleValidatedData = ReturnType<typeof validator.validateDeleteRole>;

type Role = {
  id: string;
  name: string;
};

/**********************************************************************************/

async function readRolesFromDatabase(database: RequestContext['database']) {
  const handler = database.getHandler();
  const { role: roleModel } = database.getModels();

  const roles = await handler
    .select({ id: roleModel.id, name: roleModel.name })
    .from(roleModel)
    .orderBy(asc(roleModel.name));

  return roles;
}

async function insertRoleToDatabase(
  database: RequestContext['database'],
  roleToCreate: CreateRoleValidatedData,
) {
  const handler = database.getHandler();
  const { role: roleModel } = database.getModels();

  try {
    return (
      (
        await handler
          .insert(roleModel)
          //@ts-expect-error Drizzle has issues with the typing which does not allow
          // undefined value, this only a type error and works as intended
          .values(roleToCreate)
          .returning({ id: roleModel.id, name: roleModel.name })
      )[0]!
    );
  } catch (err) {
    throw handlePossibleDuplicationError(err, roleToCreate.name);
  }
}

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
      //@ts-expect-error Drizzle has issues with the typing which does not allow
      // undefined value, this only a type error and works as intended
      .set(fieldsToUpdate)
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

async function deleteRoleFromDatabase(
  database: RequestContext['database'],
  roleId: DeleteRoleValidatedData,
) {
  const handler = database.getHandler();
  const { role: roleModel, user: userModel } = database.getModels();

  // Only roles without attached users are allowed to be deleted
  const usersWithDeletedRole = (
    await handler
      .select({ count: count() })
      .from(userModel)
      .where(eq(userModel.roleId, roleId))
  )[0]!.count;
  if (usersWithDeletedRole) {
    throw new MRSError(
      HTTP_STATUS_CODES.BAD_REQUEST,
      'Role has attached users',
    );
  }

  // I've decided that if nothing was deleted because it didn't exist in the
  // first place, it is still considered as a success since the end result
  // is the same
  await handler.delete(roleModel).where(eq(roleModel.id, roleId));
}

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

export {
  deleteRoleFromDatabase,
  insertRoleToDatabase,
  readRolesFromDatabase,
  updateRoleInDatabase,
  type CreateRoleValidatedData,
  type DeleteRoleValidatedData,
  type Role,
  type UpdateRoleValidatedData,
};
