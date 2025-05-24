import { HTTP_STATUS_CODES } from '@adamakiva/movie-reservation-system-shared';
import { eq } from 'drizzle-orm';
import type { Locals } from 'express';

import { GeneralError } from '../../../utils/errors.ts';
import type { DatabaseHandler, DatabaseModel } from '../../../utils/types.ts';

import {
  userUpdateError,
  type UpdateUserValidatedData,
  type User,
} from './utils.ts';

/**********************************************************************************/

async function updateUser(
  context: Locals,
  userToUpdate: UpdateUserValidatedData,
): Promise<User> {
  const { authentication, database } = context;
  const { password, ...fieldsToUpdate } = userToUpdate;

  const handler = database.getHandler();
  const { user: userModel, role: roleModel } = database.getModels();

  let hash: string | undefined = undefined;
  if (password) {
    hash = await authentication.hashPassword(password);
  }

  const updateUserSubQuery = buildUpdateUserCTE({
    handler,
    userModel,
    userToUpdate: { ...fieldsToUpdate, hash },
  });

  try {
    const [updatedUser] = await handler
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
    if (!updatedUser) {
      throw new GeneralError(
        HTTP_STATUS_CODES.NOT_FOUND,
        `User '${userToUpdate.userId}' does not exist`,
      );
    }

    return updatedUser;
  } catch (error) {
    // The fields are asserted because if their error fields match, they will
    // be defined
    throw userUpdateError({
      error,
      email: userToUpdate.email!,
      role: userToUpdate.roleId!,
    });
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
