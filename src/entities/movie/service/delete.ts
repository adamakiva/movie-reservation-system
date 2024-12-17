import {
  type RequestContext,
  emptyFunction,
  eq,
} from '../../../utils/index.js';

import type { DeleteMovieValidatedData } from './utils.js';

/**********************************************************************************/

async function deleteMovie(
  context: RequestContext,
  movieId: DeleteMovieValidatedData,
): Promise<void> {
  await deleteMovieFromDatabase({
    database: context.database,
    fileManager: context.fileManager,
    movieId,
  });
}

/**********************************************************************************/

async function deleteMovieFromDatabase(params: {
  database: RequestContext['database'];
  fileManager: RequestContext['fileManager'];
  movieId: DeleteMovieValidatedData;
}) {
  const { database, fileManager, movieId } = params;
  const handler = database.getHandler();
  const { movie: movieModel, moviePoster: moviePosterModel } =
    database.getModels();

  const fullPath = await handler.transaction(async (transaction) => {
    // I've decided that if nothing was deleted because it didn't exist in the
    // first place, it is still considered as a success since the end result
    // is the same
    const deletedMoviePoster = await transaction
      .delete(moviePosterModel)
      .where(eq(moviePosterModel, movieId))
      .returning({ fullPath: moviePosterModel.fileFullPath });
    if (!deletedMoviePoster.length) {
      return '';
    }
    await transaction.delete(movieModel).where(eq(movieModel, movieId));

    return deletedMoviePoster[0]!.fullPath;
  });
  if (!fullPath) {
    return;
  }

  fileManager.deleteFile(fullPath, emptyFunction);
}

/**********************************************************************************/

export { deleteMovie };
