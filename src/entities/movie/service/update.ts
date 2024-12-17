import {
  type DatabaseHandler,
  emptyFunction,
  eq,
  HTTP_STATUS_CODES,
  MRSError,
  pg,
  type RequestContext,
} from '../../../utils/index.js';

import type { Movie, UpdateMovieValidatedData } from './utils.js';

/**********************************************************************************/

async function updateMovie(
  context: RequestContext,
  movieToUpdate: UpdateMovieValidatedData,
): Promise<Movie> {
  const { database, fileManager } = context;

  const updatedMovie = await updateMovieAndPoster({
    database,
    fileManager,
    movieToUpdate,
  });

  return updatedMovie;
}

/**********************************************************************************/

// Track this issue for more optimized solution: https://github.com/drizzle-team/drizzle-orm/issues/2078
async function updateMovieAndPoster(params: {
  database: RequestContext['database'];
  fileManager: RequestContext['fileManager'];
  movieToUpdate: UpdateMovieValidatedData;
}) {
  const { database, fileManager, movieToUpdate } = params;
  const handler = database.getHandler();
  const {
    movie: movieModel,
    moviePoster: moviePosterModel,
    genre: genreModel,
  } = database.getModels();
  const { movieId, poster, ...fieldsToUpdate } = movieToUpdate;

  return await handler.transaction(async (transaction) => {
    await Promise.all([
      updateMoviePoster({
        transaction,
        moviePosterModel,
        fileManager,
        movieId,
        poster,
      }),
      updateMovieInDatabase({
        transaction,
        movieModel,
        movieId,
        fieldsToUpdate,
      }),
    ]);

    // The entry must exist since we are in the same transaction.
    // If for some reason it is not, check the transaction isolation level
    const updatedMovie = (
      await handler
        .select({
          id: movieModel.id,
          title: movieModel.title,
          description: movieModel.description,
          price: movieModel.price,
          genre: genreModel.name,
        })
        .from(movieModel)
        .where(eq(movieModel.id, movieId))
        .innerJoin(genreModel, eq(genreModel.id, movieModel.genreId))
    )[0]!;

    return updatedMovie;
  });
}

async function updateMoviePoster(params: {
  transaction: DatabaseHandler;
  moviePosterModel: ReturnType<
    RequestContext['database']['getModels']
  >['moviePoster'];
  fileManager: RequestContext['fileManager'];
  movieId: string;
  poster: UpdateMovieValidatedData['poster'];
}) {
  const { transaction, moviePosterModel, fileManager, movieId, poster } =
    params;

  if (!poster) {
    return;
  }

  const moviePoster = await transaction
    .select({ fullPath: moviePosterModel.fileFullPath })
    .from(moviePosterModel)
    .where(eq(moviePosterModel.movieId, movieId));
  if (!moviePoster.length) {
    throw new MRSError(
      HTTP_STATUS_CODES.NOT_FOUND,
      `Movie '${movieId}' does not exist`,
    );
  }

  await transaction
    .update(moviePosterModel)
    .set({
      fileFullPath: poster.path,
      fileSizeInBytes: String(poster.size),
    })
    .where(eq(moviePosterModel.movieId, movieId));

  fileManager.deleteFile(moviePoster[0]!.fullPath, emptyFunction);
}

async function updateMovieInDatabase(params: {
  transaction: DatabaseHandler;
  movieModel: ReturnType<RequestContext['database']['getModels']>['movie'];
  movieId: string;
  fieldsToUpdate: Omit<UpdateMovieValidatedData, 'movieId' | 'poster'>;
}) {
  const { transaction, movieModel, movieId, fieldsToUpdate } = params;

  if (!Object.keys(fieldsToUpdate).length) {
    return;
  }

  try {
    const updatedMovie = await transaction
      .update(movieModel)
      .set(fieldsToUpdate)
      .where(eq(movieModel.id, movieId))
      .returning({
        id: movieModel.id,
      });
    if (!updatedMovie.length) {
      throw new MRSError(
        HTTP_STATUS_CODES.NOT_FOUND,
        `Movie '${movieId}' does not exist`,
      );
    }
  } catch (err) {
    if (err instanceof pg.PostgresError) {
      throw new MRSError(
        HTTP_STATUS_CODES.NOT_FOUND,
        `Genre '${fieldsToUpdate.genreId!}' does not exist`,
      );
    }

    throw err;
  }
}

/**********************************************************************************/

export { updateMovie };
