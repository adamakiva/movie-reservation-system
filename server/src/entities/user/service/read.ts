import { HTTP_STATUS_CODES } from '@adamakiva/movie-reservation-system-shared';
import { and, asc, eq, gt, or } from 'drizzle-orm';

import { GeneralError } from '../../../utils/errors.ts';
import type {
  PaginatedResult,
  Pagination,
  RequestContext,
} from '../../../utils/types.ts';

import { encodeCursor, sanitizeElement } from '../../utils.ts';

import type {
  GetUserValidatedData,
  GetUsersValidatedData,
  User,
} from './utils.ts';

/**********************************************************************************/

async function getUsers(
  context: RequestContext,
  pagination: GetUsersValidatedData,
): Promise<PaginatedResult<{ users: User[] }>> {
  const { database } = context;
  const { cursor, pageSize } = pagination;

  const handler = database.getHandler();
  const { user: userModel, role: roleModel } = database.getModels();

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
    .limit(pageSize + 1)
    .orderBy(asc(userModel.createdAt), asc(userModel.id));

  return sanitizeUserPage(usersPage, pageSize);
}

async function getUser(
  context: RequestContext,
  userId: GetUserValidatedData,
): Promise<User> {
  const { database } = context;
  const handler = database.getHandler();
  const { user: userModel, role: roleModel } = database.getModels();

  const [user] = await handler
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
  if (!user) {
    throw new GeneralError(
      HTTP_STATUS_CODES.NOT_FOUND,
      `User '${userId}' does not exist`,
    );
  }

  return user;
}

/**********************************************************************************/

function sanitizeUserPage(
  users: (User & { createdAt: Date })[],
  pageSize: number,
) {
  let page: Pagination = { hasNext: false, cursor: null } as const;
  if (users.length > pageSize) {
    users.pop();
    const lastUser = users[users.length - 1]!;

    page = {
      hasNext: true,
      cursor: encodeCursor(lastUser.id, lastUser.createdAt),
    } as const;
  }

  return {
    users: users.map(sanitizeElement),
    page,
  } as const;
}

/**********************************************************************************/

export { getUser, getUsers };
