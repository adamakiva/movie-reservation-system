import {
  and,
  asc,
  encodeCursor,
  eq,
  gt,
  HTTP_STATUS_CODES,
  MRSError,
  or,
  pg,
  type RequestContext,
} from '../../../utils/index.js';

import type {
  validateCreateMovie,
  validateDeleteMovie,
  validateGetMovie,
  validateGetMovies,
  validateUpdateMovie,
} from '../validator.js';

/**********************************************************************************/

type GetMoviesValidatedData = ReturnType<typeof validateGetMovies>;
type GetMovieValidatedData = ReturnType<typeof validateGetMovie>;
type CreateMovieValidatedData = ReturnType<typeof validateCreateMovie>;
type UpdateMovieValidatedData = ReturnType<typeof validateUpdateMovie>;
type DeleteMovieValidatedData = ReturnType<typeof validateDeleteMovie>;

type Movie = {
  id: string;
  title: string;
  description: string;
  imagePath: string;
  price: number;
  genre: string;
};

/**********************************************************************************/

async function getPaginatedMoviesFromDatabase(
  database: RequestContext['database'],
  pagination: GetMoviesValidatedData,
) {
  const handler = database.getHandler();
  const { movie: movieModel, genre: genreModel } = database.getModels();
  const { cursor, pageSize } = pagination;

  const moviesPage = await handler
    .select({
      id: movieModel.id,
      title: movieModel.title,
      description: movieModel.description,
      imagePath: movieModel.imagePath,
      price: movieModel.price,
      genre: genreModel.name,
      createdAt: movieModel.createdAt,
    })
    .from(movieModel)
    .where(
      cursor
        ? or(
            gt(movieModel.createdAt, cursor.createdAt),
            and(
              eq(movieModel.createdAt, cursor.createdAt),
              gt(movieModel.id, cursor.movieId),
            ),
          )
        : undefined,
    )
    .innerJoin(genreModel, eq(genreModel.id, movieModel.genreId))
    // +1 Will allow us to check if there is an additional page after the current
    // one
    .limit(pageSize + 1)
    .orderBy(asc(movieModel.createdAt), asc(movieModel.id));

  return moviesPage;
}

function sanitizePaginatedMovies(
  movies: Awaited<ReturnType<typeof getPaginatedMoviesFromDatabase>>,
  pageSize: number,
) {
  if (movies.length > pageSize) {
    movies.pop();
    const lastMovie = movies[movies.length - 1]!;

    return {
      movies: movies.map(sanitizeMovie),
      page: {
        hasNext: true,
        cursor: encodeCursor(lastMovie.id, lastMovie.createdAt),
      },
    } as const;
  }

  return {
    movies: movies.map(sanitizeMovie),
    page: {
      hasNext: false,
      cursor: null,
    },
  } as const;
}

function sanitizeMovie(
  movie: Awaited<ReturnType<typeof getPaginatedMoviesFromDatabase>>[number],
) {
  const { createdAt, ...fields } = movie;

  return fields;
}

async function getMovieFromDatabase(
  database: RequestContext['database'],
  movieId: GetMovieValidatedData,
) {
  const handler = database.getHandler();
  const { movie: movieModel, genre: genreModel } = database.getModels();

  // A general note. I've checked performance stuff, and on pk limit 1 has
  // 0 effect, it is implied and will stop the search after the first result is
  // found. In general limit should be used with order by otherwise the results
  // are inconsistent (as a result of sql not guaranteeing return order for
  // query results)
  const movies = await handler
    .select({
      id: movieModel.id,
      title: movieModel.title,
      description: movieModel.description,
      imagePath: movieModel.imagePath,
      price: movieModel.price,
      genre: genreModel.name,
    })
    .from(movieModel)
    .where(eq(movieModel.id, movieId))
    .innerJoin(genreModel, eq(genreModel.id, movieModel.genreId));
  if (!movies.length) {
    throw new MRSError(
      HTTP_STATUS_CODES.NOT_FOUND,
      `Movie '${movieId}' does not exist`,
    );
  }

  return movies[0]!;
}

async function findGenreNameById(params: {
  handler: ReturnType<RequestContext['database']['getHandler']>;
  genreModel: ReturnType<RequestContext['database']['getModels']>['genre'];
  genreId: string;
}) {
  const { handler, genreModel, genreId } = params;

  const genres = await handler
    .select({ name: genreModel.name })
    .from(genreModel)
    .where(eq(genreModel.id, genreId));
  if (!genres.length) {
    throw new MRSError(
      HTTP_STATUS_CODES.NOT_FOUND,
      `Genre ${genreId} does not exist`,
    );
  }

  return genres[0]!.name;
}

// Track this issue for more optimized solution: https://github.com/drizzle-team/drizzle-orm/issues/2078
async function insertMovieToDatabase(
  database: RequestContext['database'],
  movieToCreate: CreateMovieValidatedData,
) {
  const handler = database.getHandler();
  const { movie: movieModel, genre: genreModel } = database.getModels();

  let movieData: Omit<Movie, 'genre'> = null!;
  try {
    movieData = (
      await handler.insert(movieModel).values(movieToCreate).returning({
        id: movieModel.id,
        title: movieModel.title,
        description: movieModel.description,
        imagePath: movieModel.imagePath,
        price: movieModel.price,
      })
    )[0]!;
  } catch (err) {
    if (err instanceof pg.PostgresError) {
      throw new MRSError(
        HTTP_STATUS_CODES.NOT_FOUND,
        `Genre '${movieToCreate.genreId}' does not exist`,
      );
    }

    throw err;
  }

  const genre = await findGenreNameById({
    handler,
    genreModel,
    genreId: movieToCreate.genreId,
  });

  return { ...movieData, genre } as const;
}

// Track this issue for more optimized solution: https://github.com/drizzle-team/drizzle-orm/issues/2078
async function updateMovieInDatabase(
  database: RequestContext['database'],
  movieToUpdate: UpdateMovieValidatedData,
) {
  const handler = database.getHandler();
  const { movie: movieModel, genre: genreModel } = database.getModels();
  const { movieId, ...fieldsToUpdate } = movieToUpdate;

  let genreId: string = null!;
  let movieData: Omit<Movie, 'genre'> = null!;
  try {
    const updatedMovies = await handler
      .update(movieModel)
      .set(fieldsToUpdate)
      .where(eq(movieModel.id, movieId))
      .returning({
        id: movieModel.id,
        title: movieModel.title,
        description: movieModel.description,
        imagePath: movieModel.imagePath,
        price: movieModel.price,
        genreId: movieModel.genreId,
      });
    if (!updatedMovies.length) {
      throw new MRSError(
        HTTP_STATUS_CODES.NOT_FOUND,
        `Movie '${movieId}' does not exist`,
      );
    }
    ({ genreId, ...movieData } = updatedMovies[0]!);
  } catch (err) {
    if (err instanceof pg.PostgresError) {
      throw new MRSError(
        HTTP_STATUS_CODES.NOT_FOUND,
        `Role '${movieToUpdate.genreId!}' does not exist`,
      );
    }

    throw err;
  }

  // If the first query did not throw, a genre with the given id must exist
  const genre = await findGenreNameById({ handler, genreModel, genreId });

  return { ...movieData, genre } as const;
}

async function deleteMovieFromDatabase(
  database: RequestContext['database'],
  movieId: DeleteMovieValidatedData,
) {
  const handler = database.getHandler();
  const { movie: movieModel } = database.getModels();

  // I've decided that if nothing was deleted because it didn't exist in the
  // first place, it is still considered as a success since the end result
  // is the same
  await handler.delete(movieModel).where(eq(movieModel.id, movieId));
}

/**********************************************************************************/

export {
  deleteMovieFromDatabase,
  getMovieFromDatabase,
  getPaginatedMoviesFromDatabase,
  insertMovieToDatabase,
  sanitizePaginatedMovies,
  updateMovieInDatabase,
  type CreateMovieValidatedData,
  type DeleteMovieValidatedData,
  type GetMoviesValidatedData,
  type GetMovieValidatedData,
  type Movie,
  type UpdateMovieValidatedData,
};
