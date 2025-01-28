import { eq } from 'drizzle-orm';
import pg from 'postgres';

import {
  ERROR_CODES,
  GeneralError,
  HTTP_STATUS_CODES,
  type RequestContext,
} from '../../../utils/index.js';

import type { CreateUserValidatedData, User } from './utils.js';

/**********************************************************************************/

async function createUser(
  context: RequestContext,
  userToCreate: CreateUserValidatedData,
): Promise<User> {
  const { authentication, database } = context;
  const { password, ...userData } = userToCreate;

  const hash = await authentication.hashPassword(password);

  const createdUser = await insertUserToDatabase(database, {
    ...userData,
    hash,
  });

  return createdUser;
}

/**********************************************************************************/

async function insertUserToDatabase(
  database: RequestContext['database'],
  userToCreate: Omit<CreateUserValidatedData, 'password'> & { hash: string },
) {
  const handler = database.getHandler();
  const { user: userModel, role: roleModel } = database.getModels();

  const insertSubQuery = handler.$with('insertSubQuery').as(
    handler.insert(userModel).values(userToCreate).returning({
      id: userModel.id,
      firstName: userModel.firstName,
      lastName: userModel.lastName,
      email: userModel.email,
    }),
  );

  try {
    const createdUser = await handler
      .with(insertSubQuery)
      .select({
        id: insertSubQuery.id,
        firstName: insertSubQuery.firstName,
        lastName: insertSubQuery.lastName,
        email: insertSubQuery.email,
        role: roleModel.name,
      })
      .from(insertSubQuery)
      .innerJoin(roleModel, eq(roleModel.id, userToCreate.roleId));

    return createdUser[0]!;
  } catch (err) {
    if (err instanceof pg.PostgresError) {
      switch (err.code) {
        case ERROR_CODES.POSTGRES.UNIQUE_VIOLATION:
          throw new GeneralError(
            HTTP_STATUS_CODES.CONFLICT,
            `User '${userToCreate.email}' already exists`,
            err.cause,
          );
        case ERROR_CODES.POSTGRES.FOREIGN_KEY_VIOLATION:
          throw new GeneralError(
            HTTP_STATUS_CODES.NOT_FOUND,
            `Role '${userToCreate.roleId}' does not exist`,
            err.cause,
          );
      }
    }

    throw err;
  }
}

/**********************************************************************************/

export { createUser };
