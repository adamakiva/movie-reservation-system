import { HTTP_STATUS_CODES } from '@adamakiva/movie-reservation-system-shared';
import type { Request } from 'express';

import type { ResponseWithContext } from '../../utils/types.ts';

import * as movieService from './service/index.ts';
import * as movieValidator from './validator.ts';

/**********************************************************************************/

async function getMovies(request: Request, response: ResponseWithContext) {
  const pagination = movieValidator.validateGetMovies(request);

  const movies = await movieService.getMovies(
    response.locals.context,
    pagination,
  );

  response.status(HTTP_STATUS_CODES.SUCCESS).json(movies);
}

async function getMovie(request: Request, response: ResponseWithContext) {
  const movieId = movieValidator.validateGetMovie(request);

  const movie = await movieService.getMovie(response.locals.context, movieId);

  response.status(HTTP_STATUS_CODES.SUCCESS).json(movie);
}

async function getMoviePoster(request: Request, response: ResponseWithContext) {
  const movieId = movieValidator.validateGetMoviePoster(request);

  // The response is streamed so it is handled in the lower level
  await movieService.getMoviePoster(response, movieId);
}

async function createMovie(request: Request, response: ResponseWithContext) {
  const movieToCreate = movieValidator.validateCreateMovie(request);

  const createdMovie = await movieService.createMovie(
    response.locals.context,
    movieToCreate,
  );

  response.status(HTTP_STATUS_CODES.CREATED).json(createdMovie);
}

async function updateMovie(request: Request, response: ResponseWithContext) {
  const movieToUpdate = movieValidator.validateUpdateMovie(request);

  const updatedMovie = await movieService.updateMovie(
    response.locals.context,
    movieToUpdate,
  );

  response.status(HTTP_STATUS_CODES.SUCCESS).json(updatedMovie);
}

async function deleteMovie(request: Request, response: ResponseWithContext) {
  const movieId = movieValidator.validateDeleteMovie(request);

  await movieService.deleteMovie(response.locals.context, movieId);

  response.status(HTTP_STATUS_CODES.NO_CONTENT).end();
}

/**********************************************************************************/

export {
  createMovie,
  deleteMovie,
  getMovie,
  getMoviePoster,
  getMovies,
  updateMovie,
};
