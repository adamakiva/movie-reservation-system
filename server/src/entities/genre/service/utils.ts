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
  validateCreateGenre,
  validateDeleteGenre,
  validateUpdateGenre,
} from '../validator.ts';

/**********************************************************************************/

type CreateGenreValidatedData = ReturnType<typeof validateCreateGenre>;
type UpdateGenreValidatedData = ReturnType<typeof validateUpdateGenre>;
type DeleteGenreValidatedData = ReturnType<typeof validateDeleteGenre>;

type Genre = {
  id: string;
  name: string;
};

/**********************************************************************************/

function handlePossibleDuplicationError(error: unknown, genre: string) {
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
    `Genre '${genre}' already exists`,
    error.cause,
  );
}

/**********************************************************************************/

export {
  handlePossibleDuplicationError,
  type CreateGenreValidatedData,
  type DeleteGenreValidatedData,
  type Genre,
  type UpdateGenreValidatedData,
};
