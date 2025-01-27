import pg from 'postgres';

import {
  ERROR_CODES,
  GeneralError,
  HTTP_STATUS_CODES,
} from '../../../utils/index.js';

import type {
  validateCreateHall,
  validateDeleteHall,
  validateUpdateHall,
} from '../validator.js';

/**********************************************************************************/

type CreateHallValidatedData = ReturnType<typeof validateCreateHall>;
type UpdateHallValidatedData = ReturnType<typeof validateUpdateHall>;
type DeleteHallValidatedData = ReturnType<typeof validateDeleteHall>;

type Hall = {
  id: string;
  name: string;
  rows: number;
  columns: number;
};

/**********************************************************************************/

function handlePossibleDuplicationError(err: unknown, conflictField: string) {
  if (
    err instanceof pg.PostgresError &&
    err.code === ERROR_CODES.POSTGRES.UNIQUE_VIOLATION
  ) {
    return new GeneralError(
      HTTP_STATUS_CODES.CONFLICT,
      `Hall '${conflictField}' already exists`,
      err.cause,
    );
  }

  return err;
}

/**********************************************************************************/

export {
  handlePossibleDuplicationError,
  type CreateHallValidatedData,
  type DeleteHallValidatedData,
  type Hall,
  type UpdateHallValidatedData,
};
