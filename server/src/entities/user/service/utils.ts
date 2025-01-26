import { eq } from 'drizzle-orm';

import {
  HTTP_STATUS_CODES,
  MRSError,
  type DatabaseHandler,
  type DatabaseModel,
} from '../../../utils/index.js';

import type {
  validateCreateUser,
  validateDeleteUser,
  validateGetUser,
  validateGetUsers,
  validateUpdateUser,
} from '../validator.js';

/**********************************************************************************/

type GetUsersValidatedData = ReturnType<typeof validateGetUsers>;
type GetUserValidatedData = ReturnType<typeof validateGetUser>;
type CreateUserValidatedData = ReturnType<typeof validateCreateUser>;
type UpdateUserValidatedData = ReturnType<typeof validateUpdateUser>;
type DeleteUserValidatedData = ReturnType<typeof validateDeleteUser>;

type User = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
};

/**********************************************************************************/

async function findRoleNameById(params: {
  handler: DatabaseHandler;
  roleModel: DatabaseModel<'role'>;
  roleId: string;
}) {
  const { handler, roleModel, roleId } = params;

  const roles = await handler
    .select({ name: roleModel.name })
    .from(roleModel)
    .where(eq(roleModel.id, roleId));
  if (!roles.length) {
    throw new MRSError(
      HTTP_STATUS_CODES.NOT_FOUND,
      `Role ${roleId} does not exist`,
    );
  }

  return roles[0]!.name;
}

/**********************************************************************************/

export {
  findRoleNameById,
  type CreateUserValidatedData,
  type DeleteUserValidatedData,
  type GetUsersValidatedData,
  type GetUserValidatedData,
  type UpdateUserValidatedData,
  type User,
};
