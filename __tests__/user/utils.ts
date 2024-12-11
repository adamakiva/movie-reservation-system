import assert from 'node:assert/strict';

import { eq, inArray } from 'drizzle-orm';

import type { Role } from '../../src/services/role/utils.js';
import type { User } from '../../src/services/user/utils.js';
import type { Credentials } from '../../src/utils/index.js';

import {
  randomNumber,
  randomString,
  randomUUID,
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

async function seedUser(
  serverParams: ServerParams,
  shouldHash: boolean,
  fn: (
    // eslint-disable-next-line no-unused-vars
    createdUser: User,
    // eslint-disable-next-line no-unused-vars
    role: Role,
    // eslint-disable-next-line no-unused-vars
    password: string,
  ) => Promise<unknown>,
) {
  const { authentication, database } = serverParams;
  const handler = database.getHandler();
  const { user: userModel, role: roleModel } = database.getModels();

  const entitiesToCreate = await generateUsersSeedData(
    authentication,
    1,
    shouldHash,
  );

  // This can be inside a transaction but for the same reason the delete
  // in the finally block may fail as well, resulting in the same effect
  await handler.insert(roleModel).values(entitiesToCreate.rolesToCreate);
  await handler.insert(userModel).values(
    entitiesToCreate.usersToCreate.map((userToCreate) => {
      const { password, ...fields } = userToCreate;

      return fields;
    }),
  );

  try {
    const callbackResponse = await fn(
      sanitizeSeededUsersResponse(entitiesToCreate)[0]!,
      entitiesToCreate.rolesToCreate[0]!,
      entitiesToCreate.usersToCreate[0]!.password,
    );

    return callbackResponse;
  } finally {
    await cleanupCreatedUsers(database, entitiesToCreate);
  }
}

async function seedUsers(
  serverParams: ServerParams,
  amount: number,
  shouldHash: boolean,
  // eslint-disable-next-line no-unused-vars
  fn: (createdUser: User[]) => Promise<unknown>,
) {
  const { authentication, database } = serverParams;
  const handler = database.getHandler();
  const { user: userModel, role: roleModel } = database.getModels();

  const entitiesToCreate = await generateUsersSeedData(
    authentication,
    amount,
    shouldHash,
  );

  // This can be inside a transaction but for the same reason the delete
  // in the finally block may fail as well, resulting in the same effect
  await handler.insert(roleModel).values(entitiesToCreate.rolesToCreate);
  await handler.insert(userModel).values(
    entitiesToCreate.usersToCreate.map((userToCreate) => {
      const { password, ...fields } = userToCreate;

      return fields;
    }),
  );

  try {
    const callbackResponse = await fn(
      sanitizeSeededUsersResponse(entitiesToCreate),
    );

    return callbackResponse;
  } finally {
    await cleanupCreatedUsers(database, entitiesToCreate);
  }
}

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
    } as CreateUser;
  });

  return (amount === 1 ? users[0]! : users) as T extends 1
    ? CreateUser
    : CreateUser[];
}

async function generateUsersSeedData(
  authentication: ServerParams['authentication'],
  amount: number,
  shouldHash: boolean,
) {
  const rolesToCreate = [...Array(Math.ceil(amount / 4))].map(() => {
    return { id: randomUUID(), name: randomString(8) };
  });
  let usersData = generateUsersData(
    rolesToCreate.map((role) => {
      return role.id;
    }),
    amount,
  ) as CreateUser | CreateUser[];
  if (!Array.isArray(usersData)) {
    usersData = [usersData];
  }

  const usersToCreate = await Promise.all(
    usersData.map(async (userData) => {
      return {
        id: randomUUID(),
        firstName: userData.firstName,
        lastName: userData.lastName,
        email: userData.email,
        password: userData.password,
        hash: shouldHash
          ? await authentication.hashPassword(userData.password)
          : userData.password,
        roleId: userData.roleId,
      };
    }),
  );

  return {
    rolesToCreate,
    usersToCreate,
  };
}

function sanitizeSeededUsersResponse(
  createdEntities: Awaited<ReturnType<typeof generateUsersSeedData>>,
) {
  const { usersToCreate, rolesToCreate } = createdEntities;

  return usersToCreate.map((userToCreate) => {
    const { roleId, hash, password, ...fields } = {
      ...userToCreate,
      role: rolesToCreate.find((role) => {
        return role.id === userToCreate.roleId;
      })!.name,
    };

    return fields;
  });
}

async function cleanupCreatedUsers(
  database: ServerParams['database'],
  createdEntities: Awaited<ReturnType<typeof generateUsersSeedData>>,
) {
  const handler = database.getHandler();
  const { user: userModel, role: roleModel } = database.getModels();
  const { usersToCreate, rolesToCreate } = createdEntities;

  await handler.delete(userModel).where(
    inArray(
      userModel.id,
      usersToCreate.map((userToCreate) => {
        return userToCreate.id;
      }),
    ),
  );
  await handler.delete(roleModel).where(
    inArray(
      roleModel.id,
      rolesToCreate.map((roleToCreate) => {
        return roleToCreate.id;
      }),
    ),
  );
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

async function checkUserPassword(
  serverParams: ServerParams,
  credentials: Credentials,
) {
  const { authentication, database } = serverParams;
  const handler = database.getHandler();
  const { user: userModel } = database.getModels();
  const { email, password } = credentials;

  const users = await handler
    .select({ hash: userModel.hash })
    .from(userModel)
    .where(eq(userModel.email, email));
  if (!users.length) {
    assert.fail(`Are you sure you've sent the correct credentials?`);
  }

  const isValid = await authentication.verifyPassword(users[0]!.hash, password);
  assert.deepStrictEqual(isValid, true);
}

/**********************************************************************************/

export {
  checkUserPassword,
  deleteUsers,
  generateUsersData,
  seedUser,
  seedUsers,
  type CreateUser,
  type User,
};
