import {
  ERROR_CODES,
  HTTP_STATUS_CODES,
} from '@adamakiva/movie-reservation-system-shared';

import {
  GeneralError,
  isDatabaseError,
  isError,
} from '../../../utils/errors.ts';

import type {
  validateCreateRole,
  validateDeleteRole,
  validateUpdateRole,
} from '../validator.ts';

/**********************************************************************************/

type CreateRoleValidatedData = ReturnType<typeof validateCreateRole>;
type UpdateRoleValidatedData = ReturnType<typeof validateUpdateRole>;
type DeleteRoleValidatedData = ReturnType<typeof validateDeleteRole>;

type Role = {
  id: string;
  name: string;
};

/**********************************************************************************/

function handlePossibleDuplicationError(error: unknown, role: string) {
  if (!isError(error)) {
    return new GeneralError(
      HTTP_STATUS_CODES.SERVER_ERROR,
      'Thrown a non error object',
    );
  }
  if (
    !isDatabaseError(error) ||
    error.code !== ERROR_CODES.POSTGRES.UNIQUE_VIOLATION
  ) {
    return error;
  }

  return new GeneralError(
    HTTP_STATUS_CODES.CONFLICT,
    `Role '${role}' already exists`,
    error.cause,
  );
}

function handlePossibleRestrictError(error: unknown, role: string) {
  if (!isError(error)) {
    return new GeneralError(
      HTTP_STATUS_CODES.SERVER_ERROR,
      'Thrown a non error object',
    );
  }
  if (
    !isDatabaseError(error) ||
    error.code !== ERROR_CODES.POSTGRES.RESTRICT_VIOLATION
  ) {
    return error;
  }

  return new GeneralError(
    HTTP_STATUS_CODES.CONFLICT,
    `Role '${role}' has one or more user(s) attached and can't be removed`,
    error.cause,
  );
}

/**********************************************************************************/

export {
  handlePossibleDuplicationError,
  handlePossibleRestrictError,
  type CreateRoleValidatedData,
  type DeleteRoleValidatedData,
  type Role,
  type UpdateRoleValidatedData,
};
