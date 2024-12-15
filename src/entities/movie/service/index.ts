import type { PaginatedResult, RequestContext } from '../../../utils/index.js';

import * as utils from './utils.js';

/**********************************************************************************/

async function getMovies(
  context: RequestContext,
  pagination: utils.GetMoviesValidatedData,
): Promise<PaginatedResult<{ movies: utils.Movie[] }>> {
  const movies = await utils.getPaginatedMoviesFromDatabase(
    context.database,
    pagination,
  );

  return utils.sanitizePaginatedMovies(movies, pagination.pageSize);
}

async function getMovie(
  context: RequestContext,
  movieId: utils.GetMovieValidatedData,
): Promise<utils.Movie> {
  const movie = await utils.getMovieFromDatabase(context.database, movieId);

  return movie;
}

async function createMovie(
  context: RequestContext,
  movieToCreate: utils.CreateMovieValidatedData,
): Promise<utils.Movie> {
  const { database } = context;

  const createdMovie = await utils.insertMovieToDatabase(
    database,
    movieToCreate,
  );

  return createdMovie;
}

async function updateMovie(
  context: RequestContext,
  movieToUpdate: utils.UpdateMovieValidatedData,
): Promise<utils.Movie> {
  const { database } = context;

  const updatedMovie = await utils.updateMovieInDatabase(
    database,
    movieToUpdate,
  );

  return updatedMovie;
}

async function deleteMovie(
  context: RequestContext,
  movieId: utils.DeleteMovieValidatedData,
): Promise<void> {
  await utils.deleteMovieFromDatabase(context.database, movieId);
}

/**********************************************************************************/

export { createMovie, deleteMovie, getMovie, getMovies, updateMovie };
