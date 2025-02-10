import pg from 'postgres';

import {
  ERROR_CODES,
  GeneralError,
  HTTP_STATUS_CODES,
} from '../../../utils/index.ts';

import type {
  validateCreateUser,
  validateDeleteUser,
  validateGetUser,
  validateGetUsers,
  validateUpdateUser,
} from '../validator.ts';

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

function handleUserCreationError(params: {
  err: unknown;
  email: string;
  role: string;
}) {
  const { err, email, role } = params;

  if (!(err instanceof pg.PostgresError)) {
    return err;
  }

  switch (err.code) {
    case ERROR_CODES.POSTGRES.UNIQUE_VIOLATION:
      return new GeneralError(
        HTTP_STATUS_CODES.CONFLICT,
        `User '${email}' already exists`,
        err.cause,
      );
    case ERROR_CODES.POSTGRES.FOREIGN_KEY_VIOLATION:
      return handleForeignKeyNotFoundError({ err, role });
    default:
      return new GeneralError(
        HTTP_STATUS_CODES.SERVER_ERROR,
        'Should not be possible',
        err.cause,
      );
  }
}

function handleUserUpdateError(params: {
  err: unknown;
  email: string;
  role: string;
}) {
  return handleUserCreationError(params);
}

function handleForeignKeyNotFoundError(params: {
  err: pg.PostgresError;
  role: string;
}) {
  const { err, role } = params;

  // Name matching the database schema definition (user schema)
  // @see file:///./../../../database/schemas.ts
  if (err.constraint_name === 'user_role_id_fk') {
    return new GeneralError(
      HTTP_STATUS_CODES.NOT_FOUND,
      `Role '${role}' does not exist`,
      err.cause,
    );
  }

  return new GeneralError(
    HTTP_STATUS_CODES.SERVER_ERROR,
    'Should not be possible',
    err.cause,
  );
}

/**********************************************************************************/

export {
  handleUserCreationError,
  handleUserUpdateError,
  type CreateUserValidatedData,
  type DeleteUserValidatedData,
  type GetUsersValidatedData,
  type GetUserValidatedData,
  type UpdateUserValidatedData,
  type User,
};
