import type { Request } from 'express';

import {
  HTTP_STATUS_CODES,
  type ResponseWithContext,
} from '../../utils/index.ts';

import * as genreService from './service/index.ts';
import * as genreValidator from './validator.ts';

/**********************************************************************************/

async function getGenres(_req: Request, res: ResponseWithContext) {
  const genres = await genreService.getGenres(res.locals.context);

  res.status(HTTP_STATUS_CODES.SUCCESS).json(genres);
}

async function createGenre(req: Request, res: ResponseWithContext) {
  const genreToCreate = genreValidator.validateCreateGenre(req);

  const createdGenre = await genreService.createGenre(
    res.locals.context,
    genreToCreate,
  );

  res.status(HTTP_STATUS_CODES.CREATED).json(createdGenre);
}

async function updateGenre(req: Request, res: ResponseWithContext) {
  const genreToUpdate = genreValidator.validateUpdateGenre(req);

  const updatedGenre = await genreService.updateGenre(
    res.locals.context,
    genreToUpdate,
  );

  res.status(HTTP_STATUS_CODES.SUCCESS).json(updatedGenre);
}

async function deleteGenre(req: Request, res: ResponseWithContext) {
  const genreId = genreValidator.validateDeleteGenre(req);

  await genreService.deleteGenre(res.locals.context, genreId);

  res.status(HTTP_STATUS_CODES.NO_CONTENT).end();
}

/**********************************************************************************/

export { createGenre, deleteGenre, getGenres, updateGenre };
