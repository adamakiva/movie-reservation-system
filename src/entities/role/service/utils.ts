import {
  ERROR_CODES,
  HTTP_STATUS_CODES,
  MRSError,
  pg,
} from '../../../utils/index.js';

import type {
  validateCreateRole,
  validateDeleteRole,
  validateUpdateRole,
} from '../validator.js';

/**********************************************************************************/

type CreateRoleValidatedData = ReturnType<typeof validateCreateRole>;
type UpdateRoleValidatedData = ReturnType<typeof validateUpdateRole>;
type DeleteRoleValidatedData = ReturnType<typeof validateDeleteRole>;

type Role = {
  id: string;
  name: string;
};

/**********************************************************************************/

function handlePossibleDuplicationError(err: unknown, conflictField: string) {
  if (
    err instanceof pg.PostgresError &&
    err.code === ERROR_CODES.POSTGRES.UNIQUE_VIOLATION
  ) {
    return new MRSError(
      HTTP_STATUS_CODES.CONFLICT,
      `Role '${conflictField}' already exists`,
      err.cause,
    );
  }

  return err;
}

/**********************************************************************************/

export {
  handlePossibleDuplicationError,
  type CreateRoleValidatedData,
  type DeleteRoleValidatedData,
  type Role,
  type UpdateRoleValidatedData,
};
