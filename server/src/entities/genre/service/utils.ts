import pg from 'postgres';

import {
  ERROR_CODES,
  GeneralError,
  HTTP_STATUS_CODES,
} from '../../../utils/index.js';

import type {
  validateCreateGenre,
  validateDeleteGenre,
  validateUpdateGenre,
} from '../validator.js';

/**********************************************************************************/

type CreateGenreValidatedData = ReturnType<typeof validateCreateGenre>;
type UpdateGenreValidatedData = ReturnType<typeof validateUpdateGenre>;
type DeleteGenreValidatedData = ReturnType<typeof validateDeleteGenre>;

type Genre = {
  id: string;
  name: string;
};

/**********************************************************************************/

function handlePossibleDuplicationError(err: unknown, genre: string) {
  if (
    !(err instanceof pg.PostgresError) ||
    err.code !== ERROR_CODES.POSTGRES.UNIQUE_VIOLATION
  ) {
    return err;
  }

  return new GeneralError(
    HTTP_STATUS_CODES.CONFLICT,
    `Genre '${genre}' already exists`,
    err.cause,
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
