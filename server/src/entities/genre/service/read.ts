import type { Locals } from 'express';

import type { Genre } from './utils.ts';

/**********************************************************************************/

async function getGenres(context: Locals): Promise<Genre[]> {
  const { database } = context;

  const handler = database.getHandler();
  const { genre: genreModel } = database.getModels();

  return await handler
    .select({ id: genreModel.id, name: genreModel.name })
    .from(genreModel);
}

/*********************************************************************************/

export { getGenres };
