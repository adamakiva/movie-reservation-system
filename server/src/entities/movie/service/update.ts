import { HTTP_STATUS_CODES } from '@adamakiva/movie-reservation-system-shared';
import { eq } from 'drizzle-orm';

import { GeneralError } from '../../../utils/errors.ts';
import type {
  DatabaseHandler,
  DatabaseModel,
  RequestContext,
} from '../../../utils/types.ts';

import {
  handlePossibleMissingGenreError,
  type Movie,
  type UpdateMovieValidatedData,
} from './utils.ts';

/**********************************************************************************/

async function updateMovie(
  context: RequestContext,
  movieToUpdate: UpdateMovieValidatedData,
): Promise<Movie> {
  const { database } = context;

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
    now: new Date(),
  });

  try {
    const [updatedMovie] = await handler
      .with(...Object.values(subQueries))
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
        `Movie '${movieToUpdate.movieId}' does not exist`,
      );
    }

    return updatedMovie;
  } catch (error) {
    // Genre type is asserted because if the error type match, it will be defined
    throw handlePossibleMissingGenreError(error, movieToUpdate.genreId!);
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
  now: Date;
}) {
  const {
    handler,
    models: { movie: movieModel, moviePoster: moviePosterModel },
    movieToUpdate,
    now,
  } = params;
  const { movieId, poster, ...fieldsToUpdate } = movieToUpdate;

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
    return { updateMovieSubQuery } as const;
  }

  const insertMoviePosterSubQuery = handler.$with('insert_movie_poster').as(
    handler.insert(moviePosterModel).values({
      movieId,
      absolutePath: poster.absolutePath,
      mimeType: poster.mimeType,
      sizeInBytes: poster.sizeInBytes,
      createdAt: now,
      updatedAt: now,
    }),
  );

  return { updateMovieSubQuery, insertMoviePosterSubQuery } as const;
}

/**********************************************************************************/

export { updateMovie };
