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

function handlePossibleDuplicationError(error: unknown, hall: string) {
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
    `Hall '${hall}' already exists`,
    error.cause,
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
