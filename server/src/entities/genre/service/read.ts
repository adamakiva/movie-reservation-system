import { asc } from 'drizzle-orm';

import type { RequestContext } from '../../../utils/types.ts';

import type { Genre } from './utils.ts';

/**********************************************************************************/

async function getGenres(context: RequestContext): Promise<Genre[]> {
  const { database } = context;

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
