import { type RequestContext, eq } from '../../../utils/index.js';

import type { DeleteMovieValidatedData } from './utils.js';

/**********************************************************************************/

async function deleteMovie(
  context: RequestContext,
  movieId: DeleteMovieValidatedData,
): Promise<void> {
  await deleteMovieFromDatabase(context, movieId);
}

/**********************************************************************************/

async function deleteMovieFromDatabase(
  context: RequestContext,
  movieId: DeleteMovieValidatedData,
) {
  const { database, fileManager, logger } = context;
  const handler = database.getHandler();
  const { movie: movieModel, moviePoster: moviePosterModel } =
    database.getModels();

  const absolutePath = await handler.transaction(async (transaction) => {
    // I've decided that if nothing was deleted because it didn't exist in the
    // first place, it is still considered as a success since the end result
    // is the same
    const deletedMoviePoster = await transaction
      .delete(moviePosterModel)
      .where(eq(moviePosterModel.movieId, movieId))
      .returning({ absolutePath: moviePosterModel.absolutePath });
    if (!deletedMoviePoster.length) {
      return '';
    }
    await transaction.delete(movieModel).where(eq(movieModel.id, movieId));

    return deletedMoviePoster[0]!.absolutePath;
  });
  if (!absolutePath) {
    return;
  }

  fileManager.deleteFile(absolutePath).catch((err: unknown) => {
    logger.warn(`Failure to delete file: ${absolutePath}`, err);
  });
}

/**********************************************************************************/

export { deleteMovie };
