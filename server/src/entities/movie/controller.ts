import { HTTP_STATUS_CODES } from '@adamakiva/movie-reservation-system-shared';
import type { Request, Response } from 'express';

import * as movieService from './service/index.ts';
import * as movieValidator from './validator.ts';

/**********************************************************************************/

async function getMovies(request: Request, response: Response) {
  const pagination = movieValidator.validateGetMovies(request);

  const movies = await movieService.getMovies(request.app.locals, pagination);

  response.status(HTTP_STATUS_CODES.SUCCESS).json(movies);
}

async function getMovie(request: Request, response: Response) {
  const { movieId } = movieValidator.validateGetMovie(request);

  const movie = await movieService.getMovie(request.app.locals, movieId);

  response.status(HTTP_STATUS_CODES.SUCCESS).json(movie);
}

async function getMoviePoster(request: Request, response: Response) {
  const { movieId } = movieValidator.validateGetMoviePoster(request);

  // The response is streamed so it is handled in the lower level
  await movieService.getMoviePoster({
    context: request.app.locals,
    response,
    movieId,
  });
}

async function createMovie(request: Request, response: Response) {
  const movieToCreate = movieValidator.validateCreateMovie(request);

  const createdMovie = await movieService.createMovie(
    request.app.locals,
    movieToCreate,
  );

  response.status(HTTP_STATUS_CODES.CREATED).json(createdMovie);
}

async function updateMovie(request: Request, response: Response) {
  const movieToUpdate = movieValidator.validateUpdateMovie(request);

  const updatedMovie = await movieService.updateMovie(
    request.app.locals,
    movieToUpdate,
  );

  response.status(HTTP_STATUS_CODES.SUCCESS).json(updatedMovie);
}

async function deleteMovie(request: Request, response: Response) {
  const { movieId } = movieValidator.validateDeleteMovie(request);

  await movieService.deleteMovie(request.app.locals, movieId);

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
