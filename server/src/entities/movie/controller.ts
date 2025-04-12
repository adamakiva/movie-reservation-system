import { HTTP_STATUS_CODES } from '@adamakiva/movie-reservation-system-shared';
import type { Request } from 'express';

import type { ResponseWithContext } from '../../utils/index.ts';

import * as movieService from './service/index.ts';
import * as movieValidator from './validator.ts';

/**********************************************************************************/

async function getMovies(req: Request, res: ResponseWithContext) {
  const pagination = movieValidator.validateGetMovies(req);

  const movies = await movieService.getMovies(res.locals.context, pagination);

  res.status(HTTP_STATUS_CODES.SUCCESS).json(movies);
}

async function getMovie(req: Request, res: ResponseWithContext) {
  const movieId = movieValidator.validateGetMovie(req);

  const movie = await movieService.getMovie(res.locals.context, movieId);

  res.status(HTTP_STATUS_CODES.SUCCESS).json(movie);
}

async function getMoviePoster(req: Request, res: ResponseWithContext) {
  const movieId = movieValidator.validateGetMoviePoster(req);

  // The response is streamed so it is handled in the lower level
  await movieService.getMoviePoster(res, movieId);
}

async function createMovie(req: Request, res: ResponseWithContext) {
  const movieToCreate = movieValidator.validateCreateMovie(req);

  const createdMovie = await movieService.createMovie(
    res.locals.context,
    movieToCreate,
  );

  res.status(HTTP_STATUS_CODES.CREATED).json(createdMovie);
}

async function updateMovie(req: Request, res: ResponseWithContext) {
  const movieToUpdate = movieValidator.validateUpdateMovie(req);

  const updatedMovie = await movieService.updateMovie(
    res.locals.context,
    movieToUpdate,
  );

  res.status(HTTP_STATUS_CODES.SUCCESS).json(updatedMovie);
}

async function deleteMovie(req: Request, res: ResponseWithContext) {
  const movieId = movieValidator.validateDeleteMovie(req);

  await movieService.deleteMovie(res.locals.context, movieId);

  res.status(HTTP_STATUS_CODES.NO_CONTENT).end();
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
