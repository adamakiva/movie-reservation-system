import { eq, sql } from 'drizzle-orm';

import type {
  DatabaseHandler,
  DatabaseModel,
  RequestContext,
} from '../../../utils/index.js';

import {
  type CreateMovieValidatedData,
  type Movie,
  handlePossibleMissingGenreError,
} from './utils.js';

/**********************************************************************************/

async function createMovie(
  context: RequestContext,
  movieToCreate: CreateMovieValidatedData,
): Promise<Movie> {
  const { database } = context;
  const handler = database.getHandler();
  const { movie, moviePoster, genre: genreModel } = database.getModels();

  try {
    const { insertMovieSubQuery, insertMoviePosterSubQuery } = createMovieCTEs({
      handler,
      models: { movie, moviePoster },
      movieToCreate,
    });

    const [createdMovie] = await handler
      .with(insertMovieSubQuery, insertMoviePosterSubQuery)
      .select({
        id: insertMovieSubQuery.id,
        title: insertMovieSubQuery.title,
        description: insertMovieSubQuery.description,
        price: insertMovieSubQuery.price,
        genre: genreModel.name,
      })
      .from(insertMovieSubQuery)
      .innerJoin(genreModel, eq(genreModel.id, insertMovieSubQuery.genreId));

    return createdMovie!;
  } catch (err) {
    throw handlePossibleMissingGenreError(err, movieToCreate.genreId);
  }
}

/**********************************************************************************/

function createMovieCTEs(params: {
  handler: DatabaseHandler;
  models: {
    movie: DatabaseModel<'movie'>;
    moviePoster: DatabaseModel<'moviePoster'>;
  };
  movieToCreate: CreateMovieValidatedData;
}) {
  const {
    handler,
    models: { movie: movieModel, moviePoster: moviePosterModel },
    movieToCreate,
  } = params;
  const { poster, ...fields } = movieToCreate;
  const now = new Date();

  const insertMovieSubQuery = handler.$with('insert_movie').as(
    handler
      .insert(movieModel)
      .values({ ...fields, createdAt: now, updatedAt: now })
      .returning({
        id: movieModel.id,
        title: movieModel.title,
        description: movieModel.description,
        price: movieModel.price,
        genreId: movieModel.genreId,
      }),
  );
  const insertMoviePosterSubQuery = handler
    .$with('insert_movie_poster')
    .as(
      handler
        .insert(moviePosterModel)
        .select(
          sql`SELECT "id", ${poster.absolutePath}, ${poster.mimeType}, ${poster.sizeInBytes}, ${now.toISOString()}, ${now.toISOString()} FROM ${insertMovieSubQuery}`,
        ),
    );

  return {
    insertMovieSubQuery,
    insertMoviePosterSubQuery,
  };
}

/**********************************************************************************/

export { createMovie };
