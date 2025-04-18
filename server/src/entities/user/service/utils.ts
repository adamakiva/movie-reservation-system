import {
  ERROR_CODES,
  HTTP_STATUS_CODES,
} from '@adamakiva/movie-reservation-system-shared';
import type pg from 'postgres';

import {
  GeneralError,
  isDatabaseError,
  isError,
} from '../../../utils/errors.ts';

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
  error: unknown;
  email: string;
  role: string;
}) {
  const { error, email, role } = params;

  if (!isError(error)) {
    return new GeneralError(
      HTTP_STATUS_CODES.SERVER_ERROR,
      'Thrown a non error object',
    );
  }
  if (!isDatabaseError(error)) {
    return error;
  }

  switch (error.code) {
    case ERROR_CODES.POSTGRES.UNIQUE_VIOLATION:
      return new GeneralError(
        HTTP_STATUS_CODES.CONFLICT,
        `User '${email}' already exists`,
        error.cause,
      );
    case ERROR_CODES.POSTGRES.FOREIGN_KEY_VIOLATION:
      return handleForeignKeyNotFoundError({ error, role });
    default:
      return new GeneralError(
        HTTP_STATUS_CODES.SERVER_ERROR,
        'Should not be possible',
        error.cause,
      );
  }
}

function handleUserUpdateError(params: {
  error: unknown;
  email: string;
  role: string;
}) {
  return handleUserCreationError(params);
}

function handleForeignKeyNotFoundError(params: {
  error: pg.PostgresError;
  role: string;
}) {
  const { error, role } = params;

  // Name matching the database schema definition (user schema)
  // @see file:///./../../../database/schemas.ts
  if (error.constraint_name === 'user_role_id_fk') {
    return new GeneralError(
      HTTP_STATUS_CODES.NOT_FOUND,
      `Role '${role}' does not exist`,
      error.cause,
    );
  }

  return new GeneralError(
    HTTP_STATUS_CODES.SERVER_ERROR,
    'Should not be possible',
    error.cause,
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
