import {
  ERROR_CODES,
  HTTP_STATUS_CODES,
} from '@adamakiva/movie-reservation-system-shared';
import pg from 'postgres';

import { GeneralError } from '../../../utils/errors.ts';

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
  if (
    !(error instanceof pg.PostgresError) ||
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

/**********************************************************************************/

export {
  handlePossibleDuplicationError,
  type CreateRoleValidatedData,
  type DeleteRoleValidatedData,
  type Role,
  type UpdateRoleValidatedData,
};
