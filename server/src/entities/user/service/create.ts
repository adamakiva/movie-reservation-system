import { eq } from 'drizzle-orm';

import type {
  DatabaseHandler,
  DatabaseModel,
  RequestContext,
} from '../../../utils/types.ts';

import {
  userCreationError,
  type CreateUserValidatedData,
  type User,
} from './utils.ts';

/**********************************************************************************/

async function createUser(
  context: RequestContext,
  userToCreate: CreateUserValidatedData,
): Promise<User> {
  const { authentication, database } = context;
  const { password, ...userData } = userToCreate;

  const handler = database.getHandler();
  const { user: userModel, role: roleModel } = database.getModels();

  const hash = await authentication.hashPassword(password);

  const createUserSubQuery = buildCreateUserCTEs({
    handler,
    userModel,
    userToCreate: { ...userData, hash },
  });

  try {
    const [createdUser] = await handler
      .with(createUserSubQuery)
      .select({
        id: createUserSubQuery.id,
        firstName: createUserSubQuery.firstName,
        lastName: createUserSubQuery.lastName,
        email: createUserSubQuery.email,
        role: roleModel.name,
      })
      .from(createUserSubQuery)
      .innerJoin(roleModel, eq(roleModel.id, userData.roleId));

    return createdUser!;
  } catch (error) {
    throw userCreationError({
      error,
      email: userData.email,
      role: userData.roleId,
    });
  }
}

/**********************************************************************************/

function buildCreateUserCTEs(params: {
  handler: DatabaseHandler;
  userModel: DatabaseModel<'user'>;
  userToCreate: Omit<CreateUserValidatedData, 'password'> & { hash: string };
}) {
  const { handler, userModel, userToCreate } = params;

  const createUserSubQuery = handler.$with('insert_user').as(
    handler.insert(userModel).values(userToCreate).returning({
      id: userModel.id,
      firstName: userModel.firstName,
      lastName: userModel.lastName,
      email: userModel.email,
    }),
  );

  return createUserSubQuery;
}

/**********************************************************************************/

export { createUser };
