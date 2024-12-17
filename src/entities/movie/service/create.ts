import {
  HTTP_STATUS_CODES,
  MRSError,
  type RequestContext,
  pg,
} from '../../../utils/index.js';

import {
  type CreateMovieValidatedData,
  type Movie,
  findGenreNameById,
} from './utils.js';

/**********************************************************************************/

async function createMovie(
  context: RequestContext,
  movieToCreate: CreateMovieValidatedData,
): Promise<Movie> {
  const { database } = context;

  const createdMovie = await insertMovieToDatabase(database, movieToCreate);

  return createdMovie;
}

/**********************************************************************************/

// Track this issue for more optimized solution: https://github.com/drizzle-team/drizzle-orm/issues/2078
async function insertMovieToDatabase(
  database: RequestContext['database'],
  movieToCreate: CreateMovieValidatedData,
) {
  const handler = database.getHandler();
  const {
    movie: movieModel,
    moviePoster: moviePosterModel,
    genre: genreModel,
  } = database.getModels();
  const { poster, ...fields } = movieToCreate;

  const createdMovie = await handler.transaction(async (transaction) => {
    try {
      const now = new Date();

      const createdMovie = (
        await transaction
          .insert(movieModel)
          .values({ ...fields, createdAt: now, updatedAt: now })
          .returning({
            id: movieModel.id,
            title: movieModel.title,
            description: movieModel.description,
            price: movieModel.price,
          })
      )[0]!;
      await transaction.insert(moviePosterModel).values({
        movieId: createdMovie.id,
        fileFullPath: poster.path,
        fileSizeInBytes: String(poster.size),
        createdAt: now,
        updatedAt: now,
      });

      return createdMovie;
    } catch (err) {
      if (err instanceof pg.PostgresError) {
        throw new MRSError(
          HTTP_STATUS_CODES.NOT_FOUND,
          `Genre '${movieToCreate.genreId}' does not exist`,
        );
      }

      throw err;
    }
  });

  const genre = await findGenreNameById({
    handler,
    genreModel,
    genreId: movieToCreate.genreId,
  });

  return { ...createdMovie, genre } as const;
}

/**********************************************************************************/

export { createMovie };
