import { type RequestContext, asc } from '../../../utils/index.js';

import type { Genre } from './utils.js';

/**********************************************************************************/

async function getGenres(context: RequestContext): Promise<Genre[]> {
  const genres = await readGenresFromDatabase(context.database);

  return genres;
}

/**********************************************************************************/

async function readGenresFromDatabase(database: RequestContext['database']) {
  const handler = database.getHandler();
  const { genre: genreModel } = database.getModels();

  const genres = await handler
    .select({ id: genreModel.id, name: genreModel.name })
    .from(genreModel)
    .orderBy(asc(genreModel.name));

  return genres;
}

/*********************************************************************************/

export { getGenres };
