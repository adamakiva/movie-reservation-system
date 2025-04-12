import {
  ERROR_CODES,
  HTTP_STATUS_CODES,
} from '@adamakiva/movie-reservation-system-shared';
import pg from 'postgres';

import { GeneralError } from '../../../utils/index.ts';

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

function handlePossibleDuplicationError(err: unknown, role: string) {
  if (
    !(err instanceof pg.PostgresError) ||
    err.code !== ERROR_CODES.POSTGRES.UNIQUE_VIOLATION
  ) {
    return err;
  }

  return new GeneralError(
    HTTP_STATUS_CODES.CONFLICT,
    `Role '${role}' already exists`,
    err.cause,
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
