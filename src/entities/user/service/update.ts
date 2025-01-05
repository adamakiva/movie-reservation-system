import {
  ERROR_CODES,
  HTTP_STATUS_CODES,
  MRSError,
  type RequestContext,
  eq,
  pg,
} from '../../../utils/index.js';

import {
  type UpdateUserValidatedData,
  type User,
  findRoleNameById,
} from './utils.js';

/**********************************************************************************/

async function updateUser(
  context: RequestContext,
  userToUpdate: UpdateUserValidatedData,
): Promise<User> {
  const { authentication, database } = context;
  const { password, ...fieldsToUpdate } = userToUpdate;

  const hash = password
    ? await authentication.hashPassword(password)
    : undefined;

  const updatedUser = await updateUserInDatabase(database, {
    ...fieldsToUpdate,
    hash,
  });

  return updatedUser;
}

/**********************************************************************************/

// Track this issue for more optimized solution: https://github.com/drizzle-team/drizzle-orm/issues/2078
async function updateUserInDatabase(
  database: RequestContext['database'],
  userToUpdate: Omit<UpdateUserValidatedData, 'password'> & {
    hash?: string | undefined;
  },
) {
  const handler = database.getHandler();
  const { user: userModel, role: roleModel } = database.getModels();
  const { userId, ...fieldsToUpdate } = userToUpdate;

  let roleId: string = null!;
  let userData: Omit<User, 'role'> = null!;
  try {
    const updatedUsers = await handler
      .update(userModel)
      .set({ ...fieldsToUpdate, updatedAt: new Date() })
      .where(eq(userModel.id, userId))
      .returning({
        id: userModel.id,
        firstName: userModel.firstName,
        lastName: userModel.lastName,
        email: userModel.email,
        roleId: userModel.roleId,
      });
    if (!updatedUsers.length) {
      throw new MRSError(
        HTTP_STATUS_CODES.NOT_FOUND,
        `User '${userId}' does not exist`,
      );
    }
    ({ roleId, ...userData } = updatedUsers[0]!);
  } catch (err) {
    if (err instanceof pg.PostgresError) {
      switch (err.code) {
        case ERROR_CODES.POSTGRES.UNIQUE_VIOLATION:
          throw new MRSError(
            HTTP_STATUS_CODES.CONFLICT,
            `User '${userToUpdate.email!}' already exists`,
            err.cause,
          );
        case ERROR_CODES.POSTGRES.FOREIGN_KEY_VIOLATION:
          throw new MRSError(
            HTTP_STATUS_CODES.NOT_FOUND,
            `Role '${userToUpdate.roleId!}' does not exist`,
            err.cause,
          );
      }
    }

    throw err;
  }

  // If the first query did not throw, a role with the given id must exist
  const role = await findRoleNameById({ handler, roleModel, roleId });

  return { ...userData, role } as const;
}

/**********************************************************************************/

export { updateUser };
