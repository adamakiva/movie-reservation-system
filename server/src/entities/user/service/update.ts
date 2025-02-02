import { eq } from 'drizzle-orm';
import pg from 'postgres';

import {
  ERROR_CODES,
  GeneralError,
  HTTP_STATUS_CODES,
  type DatabaseHandler,
  type DatabaseModel,
  type RequestContext,
} from '../../../utils/index.js';

import type { UpdateUserValidatedData, User } from './utils.js';

/**********************************************************************************/

async function updateUser(
  context: RequestContext,
  userToUpdate: UpdateUserValidatedData,
): Promise<User> {
  const { authentication, database } = context;
  const { password, ...fieldsToUpdate } = userToUpdate;

  const hash = password
    ? await authentication.hashPassword(password)
    : undefined;

  const handler = database.getHandler();
  const { user: userModel, role: roleModel } = database.getModels();

  const updateUserSubQuery = buildUpdateUserCTE({
    handler,
    userModel,
    userToUpdate: { ...fieldsToUpdate, hash },
  });

  try {
    const updatedUser = await handler
      .with(updateUserSubQuery)
      .select({
        id: updateUserSubQuery.id,
        firstName: updateUserSubQuery.firstName,
        lastName: updateUserSubQuery.lastName,
        email: updateUserSubQuery.email,
        role: roleModel.name,
      })
      .from(updateUserSubQuery)
      .innerJoin(roleModel, eq(roleModel.id, updateUserSubQuery.roleId));
    if (!updatedUser.length) {
      throw new GeneralError(
        HTTP_STATUS_CODES.NOT_FOUND,
        `User '${userToUpdate.userId}' does not exist`,
      );
    }

    return updatedUser[0]!;
  } catch (err) {
    if (err instanceof pg.PostgresError) {
      switch (err.code) {
        case ERROR_CODES.POSTGRES.UNIQUE_VIOLATION:
          throw new GeneralError(
            HTTP_STATUS_CODES.CONFLICT,
            `User '${userToUpdate.email!}' already exists`,
            err.cause,
          );
        case ERROR_CODES.POSTGRES.FOREIGN_KEY_VIOLATION:
          throw new GeneralError(
            HTTP_STATUS_CODES.NOT_FOUND,
            `Role '${userToUpdate.roleId!}' does not exist`,
            err.cause,
          );
      }
    }

    throw err;
  }
}

/**********************************************************************************/

function buildUpdateUserCTE(params: {
  handler: DatabaseHandler;
  userModel: DatabaseModel<'user'>;
  userToUpdate: Omit<UpdateUserValidatedData, 'password'> & {
    hash?: string | undefined;
  };
}) {
  const { handler, userModel, userToUpdate } = params;
  const { userId, ...fieldsToUpdate } = userToUpdate;

  const updateUserSubQuery = handler.$with('update_user').as(
    handler
      .update(userModel)
      .set({ ...fieldsToUpdate, updatedAt: new Date() })
      .where(eq(userModel.id, userId))
      .returning({
        id: userModel.id,
        firstName: userModel.firstName,
        lastName: userModel.lastName,
        email: userModel.email,
        roleId: userModel.roleId,
      }),
  );

  return updateUserSubQuery;
}

/**********************************************************************************/

export { updateUser };
