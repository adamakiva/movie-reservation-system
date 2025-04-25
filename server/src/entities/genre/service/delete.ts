import { eq } from 'drizzle-orm';

import type { RequestContext } from '../../../utils/types.ts';

import {
  type DeleteGenreValidatedData,
  handlePossibleForeignKeyError,
} from './utils.ts';

/**********************************************************************************/

async function deleteGenre(
  context: RequestContext,
  genreId: DeleteGenreValidatedData,
): Promise<void> {
  const { database } = context;

  const handler = database.getHandler();
  const { genre: genreModel } = database.getModels();

  try {
    await handler.delete(genreModel).where(eq(genreModel.id, genreId));
  } catch (error) {
    throw handlePossibleForeignKeyError(error, genreId);
  }
}

/*********************************************************************************/

export { deleteGenre };
