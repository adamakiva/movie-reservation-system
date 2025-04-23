import { eq } from 'drizzle-orm';

import type { RequestContext } from '../../../utils/types.ts';

import {
  type DeleteGenreValidatedData,
  handlePossibleRestrictError,
} from './utils.ts';

/**********************************************************************************/

async function deleteGenre(
  context: RequestContext,
  genreId: DeleteGenreValidatedData,
): Promise<void> {
  const { database } = context;

  const handler = database.getHandler();
  const { genre: genreModel } = database.getModels();

  // I've decided that if nothing was deleted because it didn't exist in the
  // first place, it is still considered as a success since the end result
  // is the same
  try {
    await handler.delete(genreModel).where(eq(genreModel.id, genreId));
  } catch (error) {
    throw handlePossibleRestrictError(error, genreId);
  }
}

/*********************************************************************************/

export { deleteGenre };
