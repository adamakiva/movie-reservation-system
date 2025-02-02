import { and, asc, eq, gt, or } from 'drizzle-orm';

import {
  encodeCursor,
  GeneralError,
  HTTP_STATUS_CODES,
  type PaginatedResult,
  type RequestContext,
  type ResponseWithContext,
} from '../../../utils/index.js';

import type {
  GetMoviesValidatedData,
  GetMovieValidatedData,
  Movie,
} from './utils.js';

/**********************************************************************************/

async function getMovies(
  context: RequestContext,
  pagination: GetMoviesValidatedData,
): Promise<PaginatedResult<{ movies: Movie[] }>> {
  const movies = await getMoviesPageFromDatabase(context.database, pagination);

  return sanitizeMoviesPage(movies, pagination.pageSize);
}

async function getMovie(
  context: RequestContext,
  movieId: GetMovieValidatedData,
): Promise<Movie> {
  const { database } = context;
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
      price: movieModel.price,
      genre: genreModel.name,
    })
    .from(movieModel)
    .where(eq(movieModel.id, movieId))
    .innerJoin(genreModel, eq(genreModel.id, movieModel.genreId));
  if (!movies.length) {
    throw new GeneralError(
      HTTP_STATUS_CODES.NOT_FOUND,
      `Movie '${movieId}' does not exist`,
    );
  }

  return movies[0]!;
}

async function getMoviePoster(
  res: ResponseWithContext,
  movieId: GetMovieValidatedData,
): Promise<void> {
  const moviePosterMetadata = await getMoviePosterMetadataFromDatabase(
    res.locals.context.database,
    movieId,
  );

  await streamMoviePosterResponse(res, moviePosterMetadata);
}

/**********************************************************************************/

async function getMoviesPageFromDatabase(
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
              gt(movieModel.id, cursor.id),
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

function sanitizeMoviesPage(
  movies: Awaited<ReturnType<typeof getMoviesPageFromDatabase>>,
  pageSize: number,
) {
  if (movies.length <= pageSize) {
    return {
      movies: movies.map(sanitizeMovie),
      page: {
        hasNext: false,
        cursor: null,
      },
    } as const;
  }

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

function sanitizeMovie(
  movie: Awaited<ReturnType<typeof getMoviesPageFromDatabase>>[number],
) {
  const { createdAt, ...fields } = movie;

  return fields;
}

async function getMoviePosterMetadataFromDatabase(
  database: RequestContext['database'],
  movieId: string,
) {
  const handler = database.getHandler();
  const { moviePoster: moviePosterModel } = database.getModels();

  const moviePosters = await handler
    .select({
      absolutePath: moviePosterModel.absolutePath,
      mimeType: moviePosterModel.mimeType,
      sizeInBytes: moviePosterModel.sizeInBytes,
    })
    .from(moviePosterModel)
    .where(eq(moviePosterModel.movieId, movieId));
  if (!moviePosters.length) {
    throw new GeneralError(
      HTTP_STATUS_CODES.NOT_FOUND,
      `Movie '${movieId}' does not exist`,
    );
  }
  const { absolutePath, mimeType, sizeInBytes } = moviePosters[0]!;

  return {
    absolutePath,
    sizeInBytes,
    // Pay attention if the mime type needs the addition of charset, and if so
    // make sure it is handled
    contentType: mimeType,
  };
}

async function streamMoviePosterResponse(
  res: ResponseWithContext,
  movieMetadata: Awaited<ReturnType<typeof getMoviePosterMetadataFromDatabase>>,
) {
  const { absolutePath, contentType, sizeInBytes } = movieMetadata;

  res.status(HTTP_STATUS_CODES.SUCCESS).writeHead(HTTP_STATUS_CODES.SUCCESS, {
    'content-type': contentType,
    'content-length': sizeInBytes,
  });

  await res.locals.context.fileManager.streamFile(res, absolutePath);
}

/**********************************************************************************/

export { getMovie, getMoviePoster, getMovies };
