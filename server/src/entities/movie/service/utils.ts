import { eq } from 'drizzle-orm';
import pg from 'postgres';

import {
  ERROR_CODES,
  GeneralError,
  HTTP_STATUS_CODES,
  type DatabaseHandler,
  type DatabaseModel,
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

async function findGenreNameById(params: {
  handler: DatabaseHandler;
  genreModel: DatabaseModel<'genre'>;
  genreId: string;
}) {
  const { handler, genreModel, genreId } = params;

  const genres = await handler
    .select({ name: genreModel.name })
    .from(genreModel)
    .where(eq(genreModel.id, genreId));
  if (!genres.length) {
    throw new GeneralError(
      HTTP_STATUS_CODES.NOT_FOUND,
      `Genre ${genreId} does not exist`,
    );
  }

  return genres[0]!.name;
}

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
  findGenreNameById,
  handlePossibleMissingGenreError,
  type CreateMovieValidatedData,
  type DeleteMovieValidatedData,
  type GetMoviesValidatedData,
  type GetMovieValidatedData,
  type Movie,
  type UpdateMovieValidatedData,
};
