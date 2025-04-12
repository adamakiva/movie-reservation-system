import {
  ERROR_CODES,
  HTTP_STATUS_CODES,
} from '@adamakiva/movie-reservation-system-shared';
import pg from 'postgres';

import { GeneralError } from '../../../utils/index.ts';

import type {
  validateCreateHall,
  validateDeleteHall,
  validateUpdateHall,
} from '../validator.ts';

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

function handlePossibleDuplicationError(err: unknown, hall: string) {
  if (
    !(err instanceof pg.PostgresError) ||
    err.code !== ERROR_CODES.POSTGRES.UNIQUE_VIOLATION
  ) {
    return err;
  }

  return new GeneralError(
    HTTP_STATUS_CODES.CONFLICT,
    `Hall '${hall}' already exists`,
    err.cause,
  );
}

/**********************************************************************************/

export {
  handlePossibleDuplicationError,
  type CreateHallValidatedData,
  type DeleteHallValidatedData,
  type Hall,
  type UpdateHallValidatedData,
};
