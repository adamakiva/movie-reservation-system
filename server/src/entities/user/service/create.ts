import { eq } from 'drizzle-orm';

import type {
  DatabaseHandler,
  DatabaseModel,
  RequestContext,
} from '../../../utils/index.ts';

import {
  handleUserCreationError,
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

  const hash = await authentication.hashPassword(password);

  const handler = database.getHandler();
  const { user: userModel, role: roleModel } = database.getModels();

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
      .innerJoin(roleModel, eq(roleModel.id, userToCreate.roleId));

    return createdUser!;
  } catch (err) {
    throw handleUserCreationError({
      err,
      email: userToCreate.email,
      role: userToCreate.roleId,
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
