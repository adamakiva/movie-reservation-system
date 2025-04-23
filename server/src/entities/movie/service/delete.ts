import { eq } from 'drizzle-orm';

import type { RequestContext } from '../../../utils/types.ts';

import {
  type DeleteMovieValidatedData,
  handlePossibleRestrictError,
} from './utils.ts';

/**********************************************************************************/

async function deleteMovie(
  context: RequestContext,
  movieId: DeleteMovieValidatedData,
): Promise<void> {
  const { database } = context;

  const handler = database.getHandler();
  const { movie: movieModel } = database.getModels();

  // I've decided that if nothing was deleted because it didn't exist in the
  // first place, it is still considered as a success since the end result
  // is the same
  try {
    await handler.delete(movieModel).where(eq(movieModel.id, movieId));
  } catch (error) {
    throw handlePossibleRestrictError(error, movieId);
  }
}

/**********************************************************************************/

export { deleteMovie };
