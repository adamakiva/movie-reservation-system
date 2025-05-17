import type { RequestContext } from '../../../utils/types.ts';

import {
  type CreateGenreValidatedData,
  type Genre,
  possibleDuplicationError,
} from './utils.ts';

/**********************************************************************************/

async function createGenre(
  context: RequestContext,
  genreToCreate: CreateGenreValidatedData,
): Promise<Genre> {
  const { database } = context;

  const handler = database.getHandler();
  const { genre: genreModel } = database.getModels();

  try {
    const [createdGenre] = await handler
      .insert(genreModel)
      .values(genreToCreate)
      .returning({ id: genreModel.id, name: genreModel.name });

    return createdGenre!;
  } catch (error) {
    throw possibleDuplicationError(error, genreToCreate.name);
  }
}

/*********************************************************************************/

export { createGenre };
