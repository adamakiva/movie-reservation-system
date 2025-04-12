import assert from 'node:assert/strict';

import { eq } from 'drizzle-orm';

import * as serviceFunctions from '../../src/entities/user/service/index.ts';
import type { User } from '../../src/entities/user/service/utils.ts';
import * as validationFunctions from '../../src/entities/user/validator.ts';
import { USER } from '../../src/entities/user/validator.ts';

import { seedRoles } from '../role/utils.ts';
import {
  clearDatabase,
  randomAlphaNumericString,
  randomNumber,
  randomUUID,
  type ServerParams,
} from '../utils.ts';

/**********************************************************************************/

type CreateUser = Omit<User, 'id' | 'role'> & {
  password: string;
  roleId: string;
};

/**********************************************************************************/

async function seedUser(serverParams: ServerParams, withHashing = false) {
  const { createdUsers, createdRoles } = await seedUsers(
    serverParams,
    1,
    withHashing,
  );

  return {
    createdUser: createdUsers[0]!,
    createdRole: createdRoles[0]!,
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

  const createdRoles = await seedRoles(serverParams, Math.ceil(amount / ratio));

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
                roleId:
                  createdRoles[randomNumber(0, createdRoles.length - 1)]!.id,
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
    };
  } catch (err) {
    await clearDatabase(serverParams);

    throw err;
  }
}

function generateUsersData(amount = 1) {
  const users = [...Array<Omit<CreateUser, 'roleId'>>(amount)].map(() => {
    return {
      firstName: randomAlphaNumericString(USER.FIRST_NAME.MIN_LENGTH.VALUE + 1),
      lastName: randomAlphaNumericString(USER.LAST_NAME.MIN_LENGTH.VALUE + 1),
      email: `${randomAlphaNumericString(randomNumber(USER.EMAIL.MIN_LENGTH.VALUE + 1, USER.EMAIL.MAX_LENGTH.VALUE / 2))}@ph.com`,
      password: randomAlphaNumericString(USER.PASSWORD.MIN_LENGTH.VALUE + 1),
    } satisfies Omit<CreateUser, 'roleId'>;
  });

  return users;
}

function generateRandomUserData(roleId?: string) {
  return { ...generateUsersData(1)[0]!, roleId: roleId ?? randomUUID() };
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
  generateRandomUserData,
  generateUsersData,
  seedUser,
  seedUsers,
  serviceFunctions,
  USER,
  validationFunctions,
  type User,
};
