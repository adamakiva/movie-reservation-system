import { HTTP_STATUS_CODES } from '@adamakiva/movie-reservation-system-shared';
import { eq } from 'drizzle-orm';

import {
  GeneralError,
  type DatabaseHandler,
  type DatabaseModel,
  type RequestContext,
} from '../../../utils/index.ts';

import {
  handleUserUpdateError,
  type UpdateUserValidatedData,
  type User,
} from './utils.ts';

/**********************************************************************************/

async function updateUser(
  context: RequestContext,
  userToUpdate: UpdateUserValidatedData,
): Promise<User> {
  const { authentication, database } = context;
  const { password, ...fieldsToUpdate } = userToUpdate;

  const handler = database.getHandler();
  const { user: userModel, role: roleModel } = database.getModels();

  const hash = password
    ? await authentication.hashPassword(password)
    : undefined;

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
  } catch (err) {
    // The fields are asserted because if their error type matches, they will
    // be defined
    throw handleUserUpdateError({
      err,
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
