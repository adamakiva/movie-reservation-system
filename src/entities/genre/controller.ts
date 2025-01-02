import {
  HTTP_STATUS_CODES,
  type Request,
  type ResponseWithContext,
} from '../../utils/index.js';

import * as genreService from './service/index.js';
import * as genreValidator from './validator.js';

/**********************************************************************************/

async function getGenres(_req: Request, res: ResponseWithContext) {
  const genres = await genreService.getGenres(res.locals.context);

  res.status(HTTP_STATUS_CODES.SUCCESS).send(genres);
}

async function createGenre(req: Request, res: ResponseWithContext) {
  const genreToCreate = genreValidator.validateCreateGenre(req);

  const createdGenre = await genreService.createGenre(
    res.locals.context,
    genreToCreate,
  );

  res.status(HTTP_STATUS_CODES.CREATED).send(createdGenre);
}

async function updateGenre(req: Request, res: ResponseWithContext) {
  const genreToUpdate = genreValidator.validateUpdateGenre(req);

  const updatedGenre = await genreService.updateGenre(
    res.locals.context,
    genreToUpdate,
  );

  res.status(HTTP_STATUS_CODES.SUCCESS).send(updatedGenre);
}

async function deleteGenre(req: Request, res: ResponseWithContext) {
  const genreId = genreValidator.validateDeleteGenre(req);

  await genreService.deleteGenre(res.locals.context, genreId);

  res.status(HTTP_STATUS_CODES.NO_CONTENT).end();
}

/**********************************************************************************/

export { createGenre, deleteGenre, getGenres, updateGenre };
