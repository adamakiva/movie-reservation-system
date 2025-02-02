import assert from 'node:assert/strict';

import { eq, inArray } from 'drizzle-orm';

import * as serviceFunctions from '../../src/entities/user/service/index.js';
import type { User } from '../../src/entities/user/service/utils.js';
import * as validationFunctions from '../../src/entities/user/validator.js';

import { deleteRoles, seedRoles } from '../role/utils.js';
import {
  randomNumber,
  randomString,
  randomUUID,
  VALIDATION,
  type ServerParams,
} from '../utils.js';

/**********************************************************************************/

type CreateUser = Omit<User, 'id' | 'role'> & {
  password: string;
  roleId: string;
};

const { USER } = VALIDATION;

/**********************************************************************************/

async function seedUser(serverParams: ServerParams, withHashing = false) {
  const { createdUsers, createdRoles, ids } = await seedUsers(
    serverParams,
    1,
    withHashing,
  );

  return {
    createdUser: createdUsers[0]!,
    createdRole: createdRoles[0]!,
    ids,
  };
}

async function seedUsers(
  serverParams: ServerParams,
  amount: number,
  withHashing = false,
  ratio = amount / 6,
) {
  const { authentication, database } = serverParams;
  const handler = database.getHandler();
  const { user: userModel } = database.getModels();

  const usersToCreate = generateUsersData(amount);

  const { createdRoles, roleIds } = await seedRoles(
    serverParams,
    Math.ceil(amount / ratio),
  );

  try {
    const createdUsers = (
      await handler
        .insert(userModel)
        .values(
          await Promise.all(
            usersToCreate.map(async (userToCreate) => {
              const { password, ...fields } = userToCreate;

              let hash = password;
              if (withHashing) {
                hash = await authentication.hashPassword(hash);
              }

              return {
                ...fields,
                roleId: roleIds[randomNumber(0, roleIds.length - 1)]!,
                hash,
              };
            }),
          ),
        )
        .returning({
          id: userModel.id,
          firstName: userModel.firstName,
          lastName: userModel.lastName,
          email: userModel.email,
          roleId: userModel.roleId,
        })
    ).map((createdUser) => {
      const { roleId, ...fields } = createdUser;

      const roleName = createdRoles.find((role) => {
        return role.id === roleId;
      })!.name;

      return {
        ...fields,
        role: roleName,
      };
    });

    return {
      createdUsers,
      createdRoles,
      ids: {
        user: createdUsers.map(({ id }) => {
          return id;
        }),
        role: roleIds,
      },
    };
  } catch (err) {
    await deleteRoles(serverParams, ...roleIds);

    throw err;
  }
}

function generateUsersData(amount = 1) {
  const users = [...Array(amount)].map(() => {
    return {
      firstName: randomString(USER.FIRST_NAME.MIN_LENGTH.VALUE + 1),
      lastName: randomString(USER.LAST_NAME.MIN_LENGTH.VALUE + 1),
      email: `${randomString(randomNumber(USER.EMAIL.MIN_LENGTH.VALUE + 1, USER.EMAIL.MAX_LENGTH.VALUE / 2))}@ph.com`,
      password: randomString(USER.PASSWORD.MIN_LENGTH.VALUE + 1),
    } satisfies Omit<CreateUser, 'roleId'>;
  });

  return users;
}

function generateRandomUserData(roleId?: string) {
  return { ...generateUsersData(1)[0]!, roleId: roleId ?? randomUUID() };
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
  credentials: { email: string; password: string },
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
  generateRandomUserData,
  generateUsersData,
  seedUser,
  seedUsers,
  serviceFunctions,
  validationFunctions,
  type User,
};
