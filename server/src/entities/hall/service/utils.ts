import { HTTP_STATUS_CODES } from '@adamakiva/movie-reservation-system-shared';

import {
  isForeignKeyViolationError,
  isUniqueViolationError,
} from '../../../database/index.ts';
import { GeneralError, isError } from '../../../utils/errors.ts';

import type {
  validateCreateHall,
  validateDeleteHall,
  validateUpdateHall,
} from '../validator.ts';

/**********************************************************************************/

type CreateHallValidatedData = ReturnType<typeof validateCreateHall>;
type UpdateHallValidatedData = ReturnType<typeof validateUpdateHall>;
type DeleteHallValidatedData = ReturnType<typeof validateDeleteHall>['hallId'];

type Hall = {
  id: string;
  name: string;
  rows: number;
  columns: number;
};

/**********************************************************************************/

function possibleDuplicationError(error: unknown, hall: string) {
  if (!isError(error)) {
    return new GeneralError(
      HTTP_STATUS_CODES.SERVER_ERROR,
      'Thrown a non error object',
    );
  }
  if (isUniqueViolationError(error)) {
    return new GeneralError(
      HTTP_STATUS_CODES.CONFLICT,
      `Hall '${hall}' already exists`,
      error.cause,
    );
  }

  return error;
}

function possibleForeignKeyError(error: unknown, hall: string) {
  if (!isError(error)) {
    return new GeneralError(
      HTTP_STATUS_CODES.SERVER_ERROR,
      'Thrown a non error object',
    );
  }
  if (isForeignKeyViolationError(error)) {
    return new GeneralError(
      HTTP_STATUS_CODES.CONFLICT,
      `Hall '${hall}' has one or more showtime(s) attached`,
      error.cause,
    );
  }

  return error;
}

/**********************************************************************************/

export {
  possibleDuplicationError,
  possibleForeignKeyError,
  type CreateHallValidatedData,
  type DeleteHallValidatedData,
  type Hall,
  type UpdateHallValidatedData,
};
