import type { RequestContext } from '../../../utils/types.ts';

import type { Genre } from './utils.ts';

/**********************************************************************************/

async function getGenres(context: RequestContext): Promise<Genre[]> {
  const { database } = context;

  const handler = database.getHandler();
  const { genre: genreModel } = database.getModels();

  return await handler
    .select({ id: genreModel.id, name: genreModel.name })
    .from(genreModel);
}

/*********************************************************************************/

export { getGenres };
