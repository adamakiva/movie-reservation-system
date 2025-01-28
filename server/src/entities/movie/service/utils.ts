import pg from 'postgres';

import {
  ERROR_CODES,
  GeneralError,
  HTTP_STATUS_CODES,
} from '../../../utils/index.js';

import type {
  validateCreateMovie,
  validateDeleteMovie,
  validateGetMovie,
  validateGetMovies,
  validateUpdateMovie,
} from '../validator.js';

/**********************************************************************************/

type GetMoviesValidatedData = ReturnType<typeof validateGetMovies>;
type GetMovieValidatedData = ReturnType<typeof validateGetMovie>;
type CreateMovieValidatedData = ReturnType<typeof validateCreateMovie>;
type UpdateMovieValidatedData = ReturnType<typeof validateUpdateMovie>;
type DeleteMovieValidatedData = ReturnType<typeof validateDeleteMovie>;

type Movie = {
  id: string;
  title: string;
  description: string;
  price: number;
  genre: string;
};

/**********************************************************************************/

function handlePossibleMissingGenreError(err: unknown, conflictField: string) {
  if (
    err instanceof pg.PostgresError &&
    err.code === ERROR_CODES.POSTGRES.FOREIGN_KEY_VIOLATION
  ) {
    return new GeneralError(
      HTTP_STATUS_CODES.NOT_FOUND,
      `Genre '${conflictField}' does not exist`,
      err.cause,
    );
  }

  return err;
}

/**********************************************************************************/

export {
  handlePossibleMissingGenreError,
  type CreateMovieValidatedData,
  type DeleteMovieValidatedData,
  type GetMoviesValidatedData,
  type GetMovieValidatedData,
  type Movie,
  type UpdateMovieValidatedData,
};
