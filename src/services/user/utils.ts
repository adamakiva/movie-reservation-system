import {
  and,
  asc,
  encodeCursor,
  eq,
  ERROR_CODES,
  gt,
  HTTP_STATUS_CODES,
  MRSError,
  or,
  pg,
  type RequestContext,
} from '../../utils/index.js';
import type { userValidator as validator } from '../../validators/index.js';

/**********************************************************************************/

type GetUsersValidatedData = ReturnType<typeof validator.validateGetUsers>;
type GetUserValidatedData = ReturnType<typeof validator.validateGetUser>;
type CreateUserValidatedData = ReturnType<typeof validator.validateCreateUser>;
type UpdateUserValidatedData = ReturnType<typeof validator.validateUpdateUser>;
type DeleteUserValidatedData = ReturnType<typeof validator.validateDeleteUser>;

type User = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
};

/**********************************************************************************/

async function getPaginatedUsersFromDatabase(
  database: RequestContext['database'],
  pagination: GetUsersValidatedData,
) {
  const handler = database.getHandler();
  const { user: userModel, role: roleModel } = database.getModels();
  const { cursor, pageSize } = pagination;

  const usersPage = await handler
    .select({
      id: userModel.id,
      firstName: userModel.firstName,
      lastName: userModel.lastName,
      email: userModel.email,
      role: roleModel.name,
      createdAt: userModel.createdAt,
    })
    .from(userModel)
    .where(
      cursor
        ? or(
            gt(userModel.createdAt, cursor.createdAt),
            and(
              eq(userModel.createdAt, cursor.createdAt),
              gt(userModel.id, cursor.userId),
            ),
          )
        : undefined,
    )
    .innerJoin(roleModel, eq(roleModel.id, userModel.roleId))
    // +1 Will allow us to check if there is an additional page after the current
    // one
    .limit(pageSize + 1)
    .orderBy(asc(userModel.createdAt), asc(userModel.id));

  return usersPage;
}

function sanitizePaginatedUsers(
  users: Awaited<ReturnType<typeof getPaginatedUsersFromDatabase>>,
  pageSize: number,
) {
  if (users.length > pageSize) {
    users.pop();
    const lastUser = users[users.length - 1]!;

    return {
      users: users.map(sanitizeUser),
      page: {
        hasNext: true,
        cursor: encodeCursor(lastUser.id, lastUser.createdAt),
      },
    } as const;
  }

  return {
    users: users.map(sanitizeUser),
    page: {
      hasNext: false,
      cursor: null,
    },
  } as const;
}

function sanitizeUser(
  user: Awaited<ReturnType<typeof getPaginatedUsersFromDatabase>>[number],
) {
  const { createdAt, ...fields } = user;

  return fields;
}

async function getUserFromDatabase(
  database: RequestContext['database'],
  userId: GetUserValidatedData,
) {
  const handler = database.getHandler();
  const { user: userModel, role: roleModel } = database.getModels();

  // A general note. I've checked performance stuff, and on pk limit 1 has
  // 0 effect, it is implied and will stop the search after the first result is
  // found. In general limit should be used with order by otherwise the results
  // are inconsistent (as a result of sql not guaranteeing return order for
  // query results)
  const users = await handler
    .select({
      id: userModel.id,
      firstName: userModel.firstName,
      lastName: userModel.lastName,
      email: userModel.email,
      role: roleModel.name,
    })
    .from(userModel)
    .where(eq(userModel.id, userId))
    .innerJoin(roleModel, eq(roleModel.id, userModel.roleId));
  if (!users.length) {
    throw new MRSError(
      HTTP_STATUS_CODES.NOT_FOUND,
      `User '${userId}' does not exist`,
    );
  }

  return users[0]!;
}

async function findRoleNameById(params: {
  handler: ReturnType<RequestContext['database']['getHandler']>;
  roleModel: ReturnType<RequestContext['database']['getModels']>['role'];
  roleId: string;
}) {
  const { handler, roleModel, roleId } = params;

  const roles = await handler
    .select({ name: roleModel.name })
    .from(roleModel)
    .where(eq(roleModel.id, roleId));
  if (!roles.length) {
    throw new MRSError(
      HTTP_STATUS_CODES.NOT_FOUND,
      `Role ${roleId} does not exist`,
    );
  }

  return roles[0]!.name;
}

// Track this issue for more optimized solution: https://github.com/drizzle-team/drizzle-orm/issues/2078
async function insertUserToDatabase(
  database: RequestContext['database'],
  userToCreate: Omit<CreateUserValidatedData, 'password'> & { hash: string },
) {
  const handler = database.getHandler();
  const { user: userModel, role: roleModel } = database.getModels();

  let userData: Omit<User, 'role'> = null!;
  try {
    userData = (
      await handler.insert(userModel).values(userToCreate).returning({
        id: userModel.id,
        firstName: userModel.firstName,
        lastName: userModel.lastName,
        email: userModel.email,
      })
    )[0]!;
  } catch (err) {
    if (err instanceof pg.PostgresError) {
      switch (err.code) {
        case ERROR_CODES.POSTGRES.UNIQUE_VIOLATION:
          throw new MRSError(
            HTTP_STATUS_CODES.CONFLICT,
            `User '${userToCreate.email}' already exists`,
          );
        case ERROR_CODES.POSTGRES.FOREIGN_KEY_VIOLATION:
          throw new MRSError(
            HTTP_STATUS_CODES.NOT_FOUND,
            `Role '${userToCreate.roleId}' does not exist`,
          );
      }
    }

    throw err;
  }

  const role = await findRoleNameById({
    handler,
    roleModel,
    roleId: userToCreate.roleId,
  });

  return { ...userData, role } as const;
}

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
      //@ts-expect-error Drizzle has issues with the typing which does not allow
      // undefined value, this only a type error and works as intended
      .set(fieldsToUpdate)
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
          );
        case ERROR_CODES.POSTGRES.FOREIGN_KEY_VIOLATION:
          throw new MRSError(
            HTTP_STATUS_CODES.NOT_FOUND,
            `Role '${userToUpdate.roleId!}' does not exist`,
          );
      }
    }

    throw err;
  }

  // If the first query did not throw, a role with the given id must exist
  const role = await findRoleNameById({ handler, roleModel, roleId });

  return { ...userData, role } as const;
}

async function deleteUserFromDatabase(
  database: RequestContext['database'],
  userId: DeleteUserValidatedData,
) {
  const handler = database.getHandler();
  const { user: userModel } = database.getModels();

  // I've decided that if nothing was deleted because it didn't exist in the
  // first place, it is still considered as a success since the end result
  // is the same
  await handler.delete(userModel).where(eq(userModel.id, userId));
}

/**********************************************************************************/

export {
  deleteUserFromDatabase,
  getPaginatedUsersFromDatabase,
  getUserFromDatabase,
  insertUserToDatabase,
  sanitizePaginatedUsers,
  updateUserInDatabase,
  type CreateUserValidatedData,
  type DeleteUserValidatedData,
  type GetUsersValidatedData,
  type GetUserValidatedData,
  type UpdateUserValidatedData,
  type User,
};
