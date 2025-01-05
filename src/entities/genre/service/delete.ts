import {
  type RequestContext,
  count,
  eq,
  HTTP_STATUS_CODES,
  MRSError,
} from '../../../utils/index.js';

import type { DeleteGenreValidatedData } from './utils.js';

/**********************************************************************************/

async function deleteGenre(
  context: RequestContext,
  genreId: DeleteGenreValidatedData,
): Promise<void> {
  await deleteGenreFromDatabase(context.database, genreId);
}

/**********************************************************************************/

async function deleteGenreFromDatabase(
  database: RequestContext['database'],
  genreId: DeleteGenreValidatedData,
) {
  const handler = database.getHandler();
  const { genre: genreModel, movie: movieModel } = database.getModels();

  // Only genres without attached movies are allowed to be deleted
  const moviesWithDeletedGenre = (
    await handler
      .select({ count: count() })
      .from(movieModel)
      .where(eq(movieModel.genreId, genreId))
  )[0]!.count;
  if (moviesWithDeletedGenre) {
    throw new MRSError(
      HTTP_STATUS_CODES.BAD_REQUEST,
      'Genre has one or more attached movies',
    );
  }

  // I've decided that if nothing was deleted because it didn't exist in the
  // first place, it is still considered as a success since the end result
  // is the same
  await handler.delete(genreModel).where(eq(genreModel.id, genreId));
}

/*********************************************************************************/

export { deleteGenre };
