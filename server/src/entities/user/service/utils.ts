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

export {
  type CreateUserValidatedData,
  type DeleteUserValidatedData,
  type GetUsersValidatedData,
  type GetUserValidatedData,
  type UpdateUserValidatedData,
  type User,
};
