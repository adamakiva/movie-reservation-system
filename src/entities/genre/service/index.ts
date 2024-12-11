import type { RequestContext } from '../../../utils/index.js';

import * as utils from './utils.js';

/**********************************************************************************/

async function getGenres(context: RequestContext): Promise<utils.Genre[]> {
  const genres = await utils.readGenresFromDatabase(context.database);

  return genres;
}

async function createGenre(
  context: RequestContext,
  genreToCreate: utils.CreateGenreValidatedData,
): Promise<utils.Genre> {
  const createdGenre = await utils.insertGenreToDatabase(
    context.database,
    genreToCreate,
  );

  return createdGenre;
}

async function updateGenre(
  context: RequestContext,
  genreToUpdate: utils.UpdateGenreValidatedData,
): Promise<utils.Genre> {
  const updatedGenre = await utils.updateGenreInDatabase(
    context.database,
    genreToUpdate,
  );

  return updatedGenre;
}

async function deleteGenre(
  context: RequestContext,
  genreId: utils.DeleteGenreValidatedData,
): Promise<void> {
  await utils.deleteGenreFromDatabase(context.database, genreId);
}

/**********************************************************************************/

export { createGenre, deleteGenre, getGenres, updateGenre };
