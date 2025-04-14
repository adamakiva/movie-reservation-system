import { HTTP_STATUS_CODES } from '@adamakiva/movie-reservation-system-shared';
import { and, asc, eq, gt, or } from 'drizzle-orm';

import {
  GeneralError,
  type PaginatedResult,
  type RequestContext,
  type ResponseWithContext,
} from '../../../utils/index.ts';

import { encodeCursor } from '../../utils.validator.ts';

import type {
  GetMoviesValidatedData,
  GetMovieValidatedData,
  Movie,
  MoviePoster,
} from './utils.ts';

/**********************************************************************************/

async function getMovies(
  context: RequestContext,
  pagination: GetMoviesValidatedData,
): Promise<PaginatedResult<{ movies: Movie[] }>> {
  const { database } = context;
  const { cursor, pageSize } = pagination;

  const handler = database.getHandler();
  const { movie: movieModel, genre: genreModel } = database.getModels();

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

  return sanitizeMoviesPage(moviesPage, pagination.pageSize);
}

async function getMovie(
  context: RequestContext,
  movieId: GetMovieValidatedData,
): Promise<Movie> {
  const { database } = context;

  const handler = database.getHandler();
  const { movie: movieModel, genre: genreModel } = database.getModels();

  const [movie] = await handler
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
  if (!movie) {
    throw new GeneralError(
      HTTP_STATUS_CODES.NOT_FOUND,
      `Movie '${movieId}' does not exist`,
    );
  }

  return movie;
}

async function getMoviePoster(
  res: ResponseWithContext,
  movieId: GetMovieValidatedData,
): Promise<void> {
  const { database } = res.locals.context;

  const handler = database.getHandler();
  const { moviePoster: moviePosterModel } = database.getModels();

  const [moviePoster] = await handler
    .select({
      absolutePath: moviePosterModel.absolutePath,
      mimeType: moviePosterModel.mimeType,
      sizeInBytes: moviePosterModel.sizeInBytes,
    })
    .from(moviePosterModel)
    .where(eq(moviePosterModel.movieId, movieId));
  if (!moviePoster) {
    throw new GeneralError(
      HTTP_STATUS_CODES.NOT_FOUND,
      `Movie '${movieId}' does not exist`,
    );
  }
  const { absolutePath, mimeType, sizeInBytes } = moviePoster;

  await streamMoviePosterResponse(res, {
    absolutePath,
    sizeInBytes,
    // Pay attention if the mime type needs the addition of charset, and if so
    // make sure it is handled
    contentType: mimeType,
  });
}

/**********************************************************************************/

function sanitizeMoviesPage(
  movies: (Movie & { createdAt: Date })[],
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
  movie: Parameters<typeof sanitizeMoviesPage>[0][number],
) {
  const { createdAt, ...fields } = movie;

  return fields;
}

async function streamMoviePosterResponse(
  res: ResponseWithContext,
  movieMetadata: MoviePoster,
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
