import type { PaginatedResult, RequestContext } from '../../utils/index.js';

import * as utils from './utils.js';

/**********************************************************************************/

async function getUsers(
  context: RequestContext,
  pagination: utils.GetUsersValidatedData,
): Promise<PaginatedResult<{ users: utils.User[] }>> {
  const users = await utils.getPaginatedUsersFromDatabase(
    context.database,
    pagination,
  );

  return utils.sanitizePaginatedUsers(users, pagination.pageSize);
}

async function getUser(
  context: RequestContext,
  userId: utils.GetUserValidatedData,
): Promise<utils.User> {
  const user = await utils.getUserFromDatabase(context.database, userId);

  return user;
}

async function createUser(
  context: RequestContext,
  userToCreate: utils.CreateUserValidatedData,
): Promise<utils.User> {
  const { authentication, database } = context;
  const { password, ...userData } = userToCreate;

  const hash = await authentication.hashPassword(password);

  const createdUser = await utils.insertUserToDatabase(database, {
    ...userData,
    hash,
  });

  return createdUser;
}

async function updateUser(
  context: RequestContext,
  userToUpdate: utils.UpdateUserValidatedData,
): Promise<utils.User> {
  const { authentication, database } = context;
  const { password, ...fieldsToUpdate } = userToUpdate;

  const hash = password
    ? await authentication.hashPassword(password)
    : undefined;

  const updatedUser = await utils.updateUserInDatabase(database, {
    ...fieldsToUpdate,
    hash,
  });

  return updatedUser;
}

async function deleteUser(
  context: RequestContext,
  userId: utils.DeleteUserValidatedData,
): Promise<void> {
  await utils.deleteUserFromDatabase(context.database, userId);
}

/**********************************************************************************/

export { createUser, deleteUser, getUser, getUsers, updateUser };
