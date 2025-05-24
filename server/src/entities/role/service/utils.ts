import { HTTP_STATUS_CODES } from '@adamakiva/movie-reservation-system-shared';

import {
  isForeignKeyViolationError,
  isUniqueViolationError,
} from '../../../database/index.ts';
import { GeneralError, isError } from '../../../utils/errors.ts';

import type {
  validateCreateRole,
  validateDeleteRole,
  validateUpdateRole,
} from '../validator.ts';

/**********************************************************************************/

type CreateRoleValidatedData = ReturnType<typeof validateCreateRole>;
type UpdateRoleValidatedData = ReturnType<typeof validateUpdateRole>;
type DeleteRoleValidatedData = ReturnType<typeof validateDeleteRole>['roleId'];

type Role = {
  id: string;
  name: string;
};

/**********************************************************************************/

function possibleDuplicationError(error: unknown, role: string) {
  if (!isError(error)) {
    return new GeneralError(
      HTTP_STATUS_CODES.SERVER_ERROR,
      'Thrown a non error object',
    );
  }
  if (isUniqueViolationError(error)) {
    return new GeneralError(
      HTTP_STATUS_CODES.CONFLICT,
      `Role '${role}' already exists`,
      error.cause,
    );
  }

  return error;
}

function possibleForeignKeyError(error: unknown, role: string) {
  if (!isError(error)) {
    return new GeneralError(
      HTTP_STATUS_CODES.SERVER_ERROR,
      'Thrown a non error object',
    );
  }
  if (isForeignKeyViolationError(error)) {
    return new GeneralError(
      HTTP_STATUS_CODES.CONFLICT,
      `Role '${role}' has one or more user(s) attached and can't be removed`,
      error.cause,
    );
  }

  return error;
}

/**********************************************************************************/

export {
  possibleDuplicationError,
  possibleForeignKeyError,
  type CreateRoleValidatedData,
  type DeleteRoleValidatedData,
  type Role,
  type UpdateRoleValidatedData,
};
