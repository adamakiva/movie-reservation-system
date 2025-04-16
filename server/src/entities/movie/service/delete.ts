import { HTTP_STATUS_CODES } from '@adamakiva/movie-reservation-system-shared';
import { eq } from 'drizzle-orm';

import { type RequestContext, GeneralError } from '../../../utils/index.ts';

import type { DeleteMovieValidatedData } from './utils.ts';

/**********************************************************************************/

async function deleteMovie(
  context: RequestContext,
  movieId: DeleteMovieValidatedData,
): Promise<void> {
  const { database, fileManager, logger } = context;

  const handler = database.getHandler();
  const {
    movie: movieModel,
    moviePoster: moviePosterModel,
    showtime: showtimeModel,
  } = database.getModels();

  // Not using a CTE because we won't be to tell whether nothing was deleted due
  // to having an attached showtime or because it does not exist
  const absolutePath = await handler.transaction(async (transaction) => {
    // Only movies without attached showtimes are allowed to be deleted
    const hasShowtimes = await transaction.$count(
      showtimeModel,
      eq(showtimeModel.movieId, movieId),
    );
    if (hasShowtimes) {
      throw new GeneralError(
        HTTP_STATUS_CODES.BAD_REQUEST,
        'Movie has one or more attached showtime(s)',
      );
    }

    // I've decided that if nothing was deleted because it didn't exist in the
    // first place, it is still considered as a success since the end result
    // is the same
    const [deletedMoviePoster] = await transaction
      .delete(moviePosterModel)
      .where(eq(moviePosterModel.movieId, movieId))
      .returning({ absolutePath: moviePosterModel.absolutePath });
    if (!deletedMoviePoster) {
      return '';
    }
    await transaction.delete(movieModel).where(eq(movieModel.id, movieId));

    return deletedMoviePoster.absolutePath;
  });

  fileManager.deleteFile(absolutePath).catch((error: unknown) => {
    logger.warn(
      `Failure to delete file: '${absolutePath}'`,
      (error as Error).cause,
    );
  });
}

/**********************************************************************************/

export { deleteMovie };
