import { HTTP_STATUS_CODES } from '@adamakiva/movie-reservation-system-shared';
import type { Request, Response } from 'express';

import * as genreService from './service/index.ts';
import * as genreValidator from './validator.ts';

/**********************************************************************************/

async function getGenres(request: Request, response: Response) {
  const genres = await genreService.getGenres(request.app.locals);

  response.status(HTTP_STATUS_CODES.SUCCESS).json(genres);
}

async function createGenre(request: Request, response: Response) {
  const genreToCreate = genreValidator.validateCreateGenre(request);

  const createdGenre = await genreService.createGenre(
    request.app.locals,
    genreToCreate,
  );

  response.status(HTTP_STATUS_CODES.CREATED).json(createdGenre);
}

async function updateGenre(request: Request, response: Response) {
  const genreToUpdate = genreValidator.validateUpdateGenre(request);

  const updatedGenre = await genreService.updateGenre(
    request.app.locals,
    genreToUpdate,
  );

  response.status(HTTP_STATUS_CODES.SUCCESS).json(updatedGenre);
}

async function deleteGenre(request: Request, response: Response) {
  const { genreId } = genreValidator.validateDeleteGenre(request);

  await genreService.deleteGenre(request.app.locals, genreId);

  response.status(HTTP_STATUS_CODES.NO_CONTENT).end();
}

/**********************************************************************************/

export { createGenre, deleteGenre, getGenres, updateGenre };
