import type { Request } from 'express';

import { parseValidationResult, SCHEMAS } from '../utils.validator.ts';

/**********************************************************************************/

const { MOVIE, MOVIE_POSTER } = SCHEMAS;

/**********************************************************************************/

function validateGetMovies(req: Request) {
  const { query } = req;

  const validatedResult = MOVIE.READ.MANY.safeParse(query);
  const parsedValidatedResult = parseValidationResult(validatedResult);

  return parsedValidatedResult;
}

function validateGetMovie(req: Request) {
  const { params } = req;

  const validatedResult = MOVIE.READ.SINGLE.safeParse(params);
  const { movie_id: movieId } = parseValidationResult(validatedResult);

  return movieId;
}

function validateGetMoviePoster(req: Request) {
  const { params } = req;

  const validatedResult = MOVIE_POSTER.READ.safeParse(params);
  const { movie_id: movieId } = parseValidationResult(validatedResult);

  return movieId;
}

function validateCreateMovie(req: Request) {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const { body, file } = req;

  const validatedResult = MOVIE.CREATE.safeParse({
    ...body,
    poster: file,
  });
  const parsedValidatedResult = parseValidationResult(validatedResult);

  return parsedValidatedResult;
}

function validateUpdateMovie(req: Request) {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const { body, params, file } = req;

  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const updates = file ? { ...body, poster: file } : body;

  const validatedBodyResult = MOVIE.UPDATE.BODY.safeParse(updates);
  const movieToUpdate = parseValidationResult(validatedBodyResult);

  const validatedParamsResult = MOVIE.UPDATE.PARAMS.safeParse(params);
  const { movie_id: movieId } = parseValidationResult(validatedParamsResult);

  return {
    ...movieToUpdate,
    movieId,
  } as const;
}

function validateDeleteMovie(req: Request) {
  const { params } = req;

  const validatedResult = MOVIE.DELETE.safeParse(params);
  const { movie_id: movieId } = parseValidationResult(validatedResult);

  return movieId;
}

/**********************************************************************************/

export {
  validateCreateMovie,
  validateDeleteMovie,
  validateGetMovie,
  validateGetMoviePoster,
  validateGetMovies,
  validateUpdateMovie,
};
