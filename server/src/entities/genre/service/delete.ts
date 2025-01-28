import { count, eq } from 'drizzle-orm';

import {
  type RequestContext,
  GeneralError,
  HTTP_STATUS_CODES,
} from '../../../utils/index.js';

import type { DeleteGenreValidatedData } from './utils.js';

/**********************************************************************************/

async function deleteGenre(
  context: RequestContext,
  genreId: DeleteGenreValidatedData,
): Promise<void> {
  const { database } = context;
  const handler = database.getHandler();
  const { genre: genreModel, movie: movieModel } = database.getModels();

  // Not using a CTE because we won't be to tell whether nothing was deleted due
  // to having an attached movie or because it does not exist
  await handler.transaction(async (transaction) => {
    // Only genres without attached movies are allowed to be deleted
    const moviesWithDeletedGenre = (
      await transaction
        .select({ count: count() })
        .from(movieModel)
        .where(eq(movieModel.genreId, genreId))
    )[0]!.count;
    if (moviesWithDeletedGenre) {
      throw new GeneralError(
        HTTP_STATUS_CODES.BAD_REQUEST,
        'Genre has one or more attached movies',
      );
    }

    // I've decided that if nothing was deleted because it didn't exist in the
    // first place, it is still considered as a success since the end result
    // is the same
    await transaction.delete(genreModel).where(eq(genreModel.id, genreId));
  });
}

/*********************************************************************************/

export { deleteGenre };
