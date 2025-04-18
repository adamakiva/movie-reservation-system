import { HTTP_STATUS_CODES } from '@adamakiva/movie-reservation-system-shared';
import type { Request } from 'express';

import type { ResponseWithContext } from '../../utils/types.ts';

import * as genreService from './service/index.ts';
import * as genreValidator from './validator.ts';

/**********************************************************************************/

async function getGenres(_: Request, response: ResponseWithContext) {
  const genres = await genreService.getGenres(response.locals.context);

  response.status(HTTP_STATUS_CODES.SUCCESS).json(genres);
}

async function createGenre(request: Request, response: ResponseWithContext) {
  const genreToCreate = genreValidator.validateCreateGenre(request);

  const createdGenre = await genreService.createGenre(
    response.locals.context,
    genreToCreate,
  );

  response.status(HTTP_STATUS_CODES.CREATED).json(createdGenre);
}

async function updateGenre(request: Request, response: ResponseWithContext) {
  const genreToUpdate = genreValidator.validateUpdateGenre(request);

  const updatedGenre = await genreService.updateGenre(
    response.locals.context,
    genreToUpdate,
  );

  response.status(HTTP_STATUS_CODES.SUCCESS).json(updatedGenre);
}

async function deleteGenre(request: Request, response: ResponseWithContext) {
  const genreId = genreValidator.validateDeleteGenre(request);

  await genreService.deleteGenre(response.locals.context, genreId);

  response.status(HTTP_STATUS_CODES.NO_CONTENT).end();
}

/**********************************************************************************/

export { createGenre, deleteGenre, getGenres, updateGenre };
