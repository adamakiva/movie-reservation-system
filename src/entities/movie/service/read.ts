import {
  and,
  asc,
  buildContentType,
  encodeCursor,
  eq,
  extname,
  gt,
  HTTP_STATUS_CODES,
  MRSError,
  or,
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
  const movies = await getPaginatedMoviesFromDatabase(
    context.database,
    pagination,
  );

  return sanitizePaginatedMovies(movies, pagination.pageSize);
}

async function getMovie(
  context: RequestContext,
  movieId: GetMovieValidatedData,
): Promise<Movie> {
  const movie = await getMovieFromDatabase(context.database, movieId);

  return movie;
}

async function getMoviePoster(
  res: ResponseWithContext,
  movieId: GetMovieValidatedData,
): Promise<void> {
  const moviePosterMetadata = await getMoviePosterMetadataFromDatabase(
    res.locals.context.database,
    movieId,
  );

  streamMoviePosterResponse(res, moviePosterMetadata);
}

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

async function getMoviePosterMetadataFromDatabase(
  database: RequestContext['database'],
  movieId: string,
) {
  const handler = database.getHandler();
  const { moviePoster: moviePosterModel } = database.getModels();

  const moviePosters = await handler
    .select({
      fullPath: moviePosterModel.fileFullPath,
      sizeInBytes: moviePosterModel.fileSizeInBytes,
    })
    .from(moviePosterModel)
    .where(eq(moviePosterModel.movieId, movieId));
  if (!moviePosters.length) {
    throw new MRSError(
      HTTP_STATUS_CODES.NOT_FOUND,
      `Movie '${movieId}' does not exist`,
    );
  }
  const { fullPath, sizeInBytes } = moviePosters[0]!;

  const contentType = buildContentType(extname(fullPath));
  if (!contentType) {
    throw new MRSError(
      HTTP_STATUS_CODES.SERVER_ERROR,
      'Should not be possible. The database is corrupted',
    );
  }

  return {
    fullPath,
    sizeInBytes,
    contentType,
  };
}

function streamMoviePosterResponse(
  res: ResponseWithContext,
  movieMetadata: Awaited<ReturnType<typeof getMoviePosterMetadataFromDatabase>>,
) {
  const { fullPath, contentType, sizeInBytes } = movieMetadata;

  res.status(HTTP_STATUS_CODES.SUCCESS).writeHead(HTTP_STATUS_CODES.SUCCESS, {
    'content-type': contentType,
    'content-length': sizeInBytes,
  });

  res.locals.context.fileManager.streamFile(res, fullPath);
}

/**********************************************************************************/

export { getMovie, getMoviePoster, getMovies };
