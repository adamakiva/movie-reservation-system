import { eq } from 'drizzle-orm';

import {
  type DatabaseHandler,
  type DatabaseModel,
  GeneralError,
  HTTP_STATUS_CODES,
  type RequestContext,
} from '../../../utils/index.js';

import {
  handlePossibleMissingGenreError,
  type Movie,
  type UpdateMovieValidatedData,
} from './utils.js';

/**********************************************************************************/

async function updateMovie(
  context: RequestContext,
  movieToUpdate: UpdateMovieValidatedData,
): Promise<Movie> {
  const { database, fileManager, logger } = context;
  const handler = database.getHandler();
  const {
    movie: movieModel,
    moviePoster: moviePosterModel,
    genre: genreModel,
  } = database.getModels();

  const subQueries = buildUpdateMovieCTEs({
    handler,
    models: { movie: movieModel, moviePoster: moviePosterModel },
    movieToUpdate,
  });

  try {
    if (subQueries.updateMoviePosterSubQuery) {
      return await updateMovieIncludingPosterInDatabase({
        handler,
        fileManager,
        subQueries,
        models: {
          genre: genreModel,
          moviePoster: moviePosterModel,
        },
        movieId: movieToUpdate.movieId,
        logger,
      });
    }

    return await updateMovieInDatabase({
      handler,
      subQueries,
      genreModel,
      movieId: movieToUpdate.movieId,
    });
  } catch (err) {
    // Genre type is asserted because if the error type match, it will be defined
    throw handlePossibleMissingGenreError(err, movieToUpdate.genreId!);
  }
}

/**********************************************************************************/

function buildUpdateMovieCTEs(params: {
  handler: DatabaseHandler;
  models: {
    movie: DatabaseModel<'movie'>;
    moviePoster: DatabaseModel<'moviePoster'>;
  };
  movieToUpdate: UpdateMovieValidatedData;
}) {
  const {
    handler,
    models: { movie: movieModel, moviePoster: moviePosterModel },
    movieToUpdate,
  } = params;
  const { movieId, poster, ...fieldsToUpdate } = movieToUpdate;
  const now = new Date();

  const updateMovieSubQuery = handler.$with('update_movie').as(
    handler
      .update(movieModel)
      .set({ ...fieldsToUpdate, updatedAt: now })
      .where(eq(movieModel.id, movieId))
      .returning({
        id: movieModel.id,
        title: movieModel.title,
        description: movieModel.description,
        price: movieModel.price,
        genreId: movieModel.genreId,
      }),
  );

  if (!poster) {
    return {
      updateMovieSubQuery,
    } as const;
  }

  const updateMoviePosterSubQuery = handler.$with('update_movie_poster').as(
    handler
      .update(moviePosterModel)
      .set({
        absolutePath: poster.absolutePath,
        sizeInBytes: poster.sizeInBytes,
        updatedAt: now,
      })
      .where(eq(moviePosterModel.movieId, movieId)),
  );

  return {
    updateMovieSubQuery,
    updateMoviePosterSubQuery,
  } as const;
}

async function updateMovieIncludingPosterInDatabase(params: {
  handler: DatabaseHandler;
  fileManager: RequestContext['fileManager'];
  subQueries: Awaited<ReturnType<typeof buildUpdateMovieCTEs>>;
  models: {
    genre: DatabaseModel<'genre'>;
    moviePoster: DatabaseModel<'moviePoster'>;
  };
  movieId: string;
  logger: RequestContext['logger'];
}) {
  const {
    handler,
    fileManager,
    subQueries,
    models: { genre: genreModel, moviePoster: moviePosterModel },
    movieId,
    logger,
  } = params;

  return await handler.transaction(async (transaction) => {
    // Making this a separate query because we need the old absolute path
    // in order to remove the old file
    const [moviePoster] = await transaction
      .select({
        absolutePath: moviePosterModel.absolutePath,
      })
      .from(moviePosterModel)
      .where(eq(moviePosterModel.movieId, movieId));
    if (!moviePoster) {
      throw new GeneralError(
        HTTP_STATUS_CODES.NOT_FOUND,
        `Movie '${movieId}' does not exist`,
      );
    }

    const outdatedFileAbsolutePath = moviePoster.absolutePath;

    const updatedMovie = await updateMovieInDatabase({
      handler,
      subQueries,
      genreModel,
      movieId,
    });

    fileManager.deleteFile(outdatedFileAbsolutePath).catch((err: unknown) => {
      logger.warn(
        `Failure to delete old file: ${outdatedFileAbsolutePath}`,
        (err as Error).cause,
      );
    });

    return updatedMovie;
  });
}

async function updateMovieInDatabase(params: {
  handler: DatabaseHandler;
  subQueries: Awaited<ReturnType<typeof buildUpdateMovieCTEs>>;
  genreModel: DatabaseModel<'genre'>;
  movieId: string;
}) {
  const { handler, subQueries, genreModel, movieId } = params;
  const sanitizedSubQueries = Object.values(params.subQueries);

  const [updatedMovie] = await handler
    .with(...sanitizedSubQueries)
    .select({
      id: subQueries.updateMovieSubQuery.id,
      title: subQueries.updateMovieSubQuery.title,
      description: subQueries.updateMovieSubQuery.description,
      price: subQueries.updateMovieSubQuery.price,
      genre: genreModel.name,
    })
    .from(subQueries.updateMovieSubQuery)
    .innerJoin(
      genreModel,
      eq(genreModel.id, subQueries.updateMovieSubQuery.genreId),
    );
  if (!updatedMovie) {
    throw new GeneralError(
      HTTP_STATUS_CODES.NOT_FOUND,
      `Movie '${movieId}' does not exist`,
    );
  }

  return updatedMovie;
}

/**********************************************************************************/

export { updateMovie };
