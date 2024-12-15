import {
  HTTP_STATUS_CODES,
  type Request,
  type ResponseWithCtx,
} from '../../utils/index.js';

import * as movieService from './service/index.js';
import * as movieValidator from './validator.js';

/**********************************************************************************/

async function getMovies(req: Request, res: ResponseWithCtx) {
  const pagination = movieValidator.validateGetMovies(req);

  const movies = await movieService.getMovies(res.locals.context, pagination);

  res.status(HTTP_STATUS_CODES.SUCCESS).json(movies);
}

async function getMovie(req: Request, res: ResponseWithCtx) {
  const movieId = movieValidator.validateGetMovie(req);

  const movie = await movieService.getMovie(res.locals.context, movieId);

  res.status(HTTP_STATUS_CODES.SUCCESS).json(movie);
}

async function createMovie(req: Request, res: ResponseWithCtx) {
  const movieToCreate = movieValidator.validateCreateMovie(req);

  const createdMovie = await movieService.createMovie(
    res.locals.context,
    movieToCreate,
  );

  res.status(HTTP_STATUS_CODES.CREATED).json(createdMovie);
}

async function updateMovie(req: Request, res: ResponseWithCtx) {
  const movieToUpdate = movieValidator.validateUpdateMovie(req);

  const updatedMovie = await movieService.updateMovie(
    res.locals.context,
    movieToUpdate,
  );

  res.status(HTTP_STATUS_CODES.SUCCESS).json(updatedMovie);
}

async function deleteMovie(req: Request, res: ResponseWithCtx) {
  const movieId = movieValidator.validateDeleteMovie(req);

  await movieService.deleteMovie(res.locals.context, movieId);

  res.status(HTTP_STATUS_CODES.NO_CONTENT).end();
}

/**********************************************************************************/

export { createMovie, deleteMovie, getMovie, getMovies, updateMovie };
