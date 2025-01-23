import type { RequestContext } from '../../../utils/index.js';

import {
  type CreateMovieValidatedData,
  type Movie,
  findGenreNameById,
  handlePossibleMissingGenreError,
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
        // Get the extension from the absolute path. Since the program built
        // the absolute path we can assume it is valid
        mimeType: poster.mimeType,
        absolutePath: poster.absolutePath,
        sizeInBytes: poster.sizeInBytes,
        createdAt: now,
        updatedAt: now,
      });

      return createdMovie;
    } catch (err) {
      throw handlePossibleMissingGenreError(err, movieToCreate.genreId);
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
