import {
  ERROR_CODES,
  HTTP_STATUS_CODES,
} from '@adamakiva/movie-reservation-system-shared';
import pg from 'postgres';

import { GeneralError } from '../../../utils/index.ts';

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
  if (
    !(error instanceof pg.PostgresError) ||
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
