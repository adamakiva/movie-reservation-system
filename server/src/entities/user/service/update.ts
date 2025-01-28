import { eq } from 'drizzle-orm';
import pg from 'postgres';

import {
  ERROR_CODES,
  GeneralError,
  HTTP_STATUS_CODES,
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

  const updatedUser = await updateUserInDatabase(database, {
    ...fieldsToUpdate,
    hash,
  });

  return updatedUser;
}

/**********************************************************************************/

async function updateUserInDatabase(
  database: RequestContext['database'],
  userToUpdate: Omit<UpdateUserValidatedData, 'password'> & {
    hash?: string | undefined;
  },
) {
  const handler = database.getHandler();
  const { user: userModel, role: roleModel } = database.getModels();
  const { userId, ...fieldsToUpdate } = userToUpdate;

  const updateSubQuery = handler.$with('updateSubQuery').as(
    handler
      .update(userModel)
      .set({ ...fieldsToUpdate, updatedAt: new Date() })
      .returning({
        id: userModel.id,
        firstName: userModel.firstName,
        lastName: userModel.lastName,
        email: userModel.email,
        roleId: userModel.roleId,
      }),
  );

  try {
    const updatedUser = await handler
      .with(updateSubQuery)
      .select({
        id: updateSubQuery.id,
        firstName: updateSubQuery.firstName,
        lastName: updateSubQuery.lastName,
        email: updateSubQuery.email,
        role: roleModel.name,
      })
      .from(updateSubQuery)
      .innerJoin(roleModel, eq(roleModel.id, updateSubQuery.roleId));
    if (!updatedUser.length) {
      throw new GeneralError(
        HTTP_STATUS_CODES.NOT_FOUND,
        `User '${userId}' does not exist`,
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

export { updateUser };
