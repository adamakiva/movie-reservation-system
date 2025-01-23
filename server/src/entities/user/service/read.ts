import { and, asc, eq, gt, or } from 'drizzle-orm';

import {
  HTTP_STATUS_CODES,
  MRSError,
  type PaginatedResult,
  type RequestContext,
  encodeCursor,
} from '../../../utils/index.js';

import type {
  GetUserValidatedData,
  GetUsersValidatedData,
  User,
} from './utils.js';

/**********************************************************************************/

async function getUsers(
  context: RequestContext,
  pagination: GetUsersValidatedData,
): Promise<PaginatedResult<{ users: User[] }>> {
  const users = await getPaginatedUsersFromDatabase(
    context.database,
    pagination,
  );

  return sanitizePaginatedUsers(users, pagination.pageSize);
}

async function getUser(
  context: RequestContext,
  userId: GetUserValidatedData,
): Promise<User> {
  const user = await getUserFromDatabase(context.database, userId);

  return user;
}

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

/**********************************************************************************/

export { getUser, getUsers };
