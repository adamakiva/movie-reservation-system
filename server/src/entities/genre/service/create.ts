import type { RequestContext } from '../../../utils/index.js';

import {
  type CreateGenreValidatedData,
  type Genre,
  handlePossibleDuplicationError,
} from './utils.js';

/**********************************************************************************/

async function createGenre(
  context: RequestContext,
  genreToCreate: CreateGenreValidatedData,
): Promise<Genre> {
  const createdGenre = await insertGenreToDatabase(
    context.database,
    genreToCreate,
  );

  return createdGenre;
}

/**********************************************************************************/

async function insertGenreToDatabase(
  database: RequestContext['database'],
  genreToCreate: CreateGenreValidatedData,
) {
  const handler = database.getHandler();
  const { genre: genreModel } = database.getModels();

  try {
    const createdGenre = (
      await handler
        .insert(genreModel)
        .values(genreToCreate)
        .returning({ id: genreModel.id, name: genreModel.name })
    )[0]!;

    return createdGenre;
  } catch (err) {
    throw handlePossibleDuplicationError(err, genreToCreate.name);
  }
}

/*********************************************************************************/

export { createGenre };
