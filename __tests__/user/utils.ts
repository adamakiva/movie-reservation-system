import assert from 'node:assert/strict';

import { inArray } from 'drizzle-orm';

import type { User } from '../../src/services/user/utils.js';
import { HTTP_STATUS_CODES } from '../../src/utils/index.js';

import {
  getAdminTokens,
  randomNumber,
  randomString,
  sendHttpRequest,
  type ServerParams,
} from '../utils.js';

/**********************************************************************************/

type CreateUser = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  roleId: string;
};

/**********************************************************************************/

function generateUsersData<T extends number = 1>(
  roleIds: string[],
  amount = 1 as T,
): T extends 1 ? CreateUser : CreateUser[] {
  const users = [...Array(amount)].map(() => {
    return {
      firstName: randomString(16),
      lastName: randomString(16),
      email: `${randomString(8)}@ph.com`,
      password: randomString(16),
      roleId: roleIds[randomNumber(0, roleIds.length - 1)],
    } as const as CreateUser;
  });

  return (amount === 1 ? users[0]! : users) as T extends 1
    ? CreateUser
    : CreateUser[];
}

async function createUser(
  serverParams: ServerParams,
  userToCreate: CreateUser,
  fn: (
    // eslint-disable-next-line no-unused-vars
    tokens: { accessToken: string; refreshToken: string },
    // eslint-disable-next-line no-unused-vars
    user: User,
  ) => Promise<unknown>,
) {
  const userIdsToDelete: string[] = [];

  const adminTokens = await getAdminTokens(serverParams);
  try {
    const [user] = await sendCreateUserRequest({
      route: `${serverParams.routes.base}/users`,
      accessToken: adminTokens.accessToken,
      usersToCreate: [userToCreate],
      userIdsToDelete,
    });

    const callbackResponse = await fn(adminTokens, user!);

    return callbackResponse;
  } finally {
    await deleteUsers(serverParams, ...userIdsToDelete);
  }
}

async function createUsers(
  serverParams: ServerParams,
  usersToCreate: CreateUser[],
  fn: (
    // eslint-disable-next-line no-unused-vars
    tokens: { accessToken: string; refreshToken: string },
    // eslint-disable-next-line no-unused-vars
    users: User[],
  ) => Promise<unknown>,
) {
  const userIdsToDelete: string[] = [];

  const adminTokens = await getAdminTokens(serverParams);
  try {
    const users = await sendCreateUserRequest({
      route: `${serverParams.routes.base}/users`,
      accessToken: adminTokens.accessToken,
      usersToCreate,
      userIdsToDelete,
    });

    const callbackResponse = await fn(adminTokens, users);

    return callbackResponse;
  } finally {
    await deleteUsers(serverParams, ...userIdsToDelete);
  }
}

async function sendCreateUserRequest(params: {
  route: string;
  accessToken: string;
  usersToCreate: CreateUser[];
  userIdsToDelete: string[];
}) {
  const { route, accessToken, usersToCreate, userIdsToDelete } = params;

  const users = await Promise.all(
    usersToCreate.map(async (userToCreate) => {
      const res = await sendHttpRequest({
        route,
        method: 'POST',
        headers: { Authorization: accessToken },
        payload: userToCreate,
      });
      assert.strictEqual(res.status, HTTP_STATUS_CODES.CREATED);

      const user = (await res.json()) as User;
      userIdsToDelete.push(user.id);

      return user;
    }),
  );

  return users;
}

async function deleteUsers(serverParams: ServerParams, ...userIds: string[]) {
  userIds = userIds.filter((userId) => {
    return userId;
  });
  if (!userIds.length) {
    return;
  }

  const databaseHandler = serverParams.database.getHandler();
  const { user: userModel } = serverParams.database.getModels();

  await databaseHandler.delete(userModel).where(inArray(userModel.id, userIds));
}

/**********************************************************************************/

export {
  createUser,
  createUsers,
  deleteUsers,
  generateUsersData,
  type CreateUser,
  type User,
};
