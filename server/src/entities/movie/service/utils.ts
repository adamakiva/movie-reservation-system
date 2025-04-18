import {
  ERROR_CODES,
  HTTP_STATUS_CODES,
} from '@adamakiva/movie-reservation-system-shared';
import pg from 'postgres';

import { GeneralError } from '../../../utils/errors.ts';

import type {
  validateCreateMovie,
  validateDeleteMovie,
  validateGetMovie,
  validateGetMovies,
  validateUpdateMovie,
} from '../validator.ts';

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
type MoviePoster = {
  absolutePath: string;
  sizeInBytes: number;
  contentType: string;
};

/**********************************************************************************/

function handlePossibleMissingGenreError(error: unknown, genre: string) {
  if (
    !(error instanceof pg.PostgresError) ||
    error.code !== ERROR_CODES.POSTGRES.FOREIGN_KEY_VIOLATION
  ) {
    return error;
  }

  return new GeneralError(
    HTTP_STATUS_CODES.NOT_FOUND,
    `Genre '${genre}' does not exist`,
    error.cause,
  );
}

/**********************************************************************************/

export {
  handlePossibleMissingGenreError,
  type CreateMovieValidatedData,
  type DeleteMovieValidatedData,
  type GetMoviesValidatedData,
  type GetMovieValidatedData,
  type Movie,
  type MoviePoster,
  type UpdateMovieValidatedData,
};
