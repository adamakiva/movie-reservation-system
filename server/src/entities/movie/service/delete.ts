import { eq } from 'drizzle-orm';

import type { RequestContext } from '../../../utils/types.ts';

import {
  type DeleteMovieValidatedData,
  possibleForeignKeyError,
} from './utils.ts';

/**********************************************************************************/

async function deleteMovie(
  context: RequestContext,
  movieId: DeleteMovieValidatedData,
): Promise<void> {
  const { database } = context;

  const handler = database.getHandler();
  const { movie: movieModel } = database.getModels();

  try {
    await handler.delete(movieModel).where(eq(movieModel.id, movieId));
  } catch (error) {
    throw possibleForeignKeyError(error, movieId);
  }
}

/**********************************************************************************/

export { deleteMovie };
