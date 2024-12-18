import { readdir, readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';

import { inArray } from 'drizzle-orm';

import type { Genre } from '../../src/entities/genre/service/utils.js';
import type {
  Movie,
  MoviePoster,
} from '../../src/entities/movie/service/utils.js';

import { fileType } from '../../src/utils/index.js';
import {
  randomNumber,
  randomString,
  randomUUID,
  shuffleArray,
  type ServerParams,
} from '../utils.js';

/**********************************************************************************/

type CreateMovie = {
  title: string;
  description: string;
  price: number;
  poster: CreateMoviePoster;
  genreId: string;
};
type CreateMoviePoster = {
  path: string;
  mimeType: string;
  size: number;
};

/**********************************************************************************/

async function seedMovie(
  serverParams: ServerParams,
  fn: (
    // eslint-disable-next-line no-unused-vars
    createdMovie: Movie,
    // eslint-disable-next-line no-unused-vars
    genre: Genre,
    // eslint-disable-next-line no-unused-vars
    createdMoviePoster: MoviePoster,
  ) => Promise<unknown>,
) {
  const { database } = serverParams;
  const handler = database.getHandler();
  const {
    movie: movieModel,
    moviePoster: moviePosterModel,
    genre: genreModel,
  } = database.getModels();

  const entitiesToCreate = await generateMoviesSeedData(1);

  // This can be inside a transaction but for the same reason the delete
  // in the finally block may fail as well, resulting in the same effect
  await handler.insert(genreModel).values(entitiesToCreate.genresToCreate);
  await handler.insert(movieModel).values(entitiesToCreate.moviesToCreate);
  await handler
    .insert(moviePosterModel)
    .values(entitiesToCreate.moviePostersToCreate);

  try {
    const callbackResponse = await fn(
      sanitizeSeededMoviesResponse(entitiesToCreate)[0]!,
      entitiesToCreate.genresToCreate[0]!,
      entitiesToCreate.moviePostersToCreate[0]!,
    );

    return callbackResponse;
  } finally {
    await cleanupCreatedMovies(database, entitiesToCreate);
  }
}

async function seedMovies(
  serverParams: ServerParams,
  amount: number,
  // eslint-disable-next-line no-unused-vars
  fn: (createdMovie: Movie[]) => Promise<unknown>,
) {
  const { database } = serverParams;
  const handler = database.getHandler();
  const {
    movie: movieModel,
    moviePoster: moviePosterModel,
    genre: genreModel,
  } = database.getModels();

  const entitiesToCreate = await generateMoviesSeedData(amount);

  // This can be inside a transaction but for the same reason the delete
  // in the finally block may fail as well, resulting in the same effect
  await handler.insert(genreModel).values(entitiesToCreate.genresToCreate);
  await handler.insert(movieModel).values(entitiesToCreate.moviesToCreate);
  await handler
    .insert(moviePosterModel)
    .values(entitiesToCreate.moviePostersToCreate);

  try {
    const callbackResponse = await fn(
      sanitizeSeededMoviesResponse(entitiesToCreate),
    );

    return callbackResponse;
  } finally {
    await cleanupCreatedMovies(database, entitiesToCreate);
  }
}

async function generateMoviesData<T extends number = 1>(
  genreIds: string[],
  amount = 1 as T,
): Promise<T extends 1 ? CreateMovie : CreateMovie[]> {
  // -1 To force returning all movie posters
  const moviePosters = shuffleArray(await generateMoviePostersData(-1));

  const movies = [...Array(amount)].map(() => {
    return {
      title: randomString(16),
      description: randomString(256),
      price: randomNumber(0, 99) + 1,
      poster: moviePosters[randomNumber(0, moviePosters.length - 1)]!,
      genreId: genreIds[randomNumber(0, genreIds.length - 1)],
    } as CreateMovie;
  });

  return (amount === 1 ? movies[0]! : movies) as T extends 1
    ? CreateMovie
    : CreateMovie[];
}

async function generateMoviePostersData<T extends number = 1>(
  amount = 1 as T,
): Promise<T extends 1 ? CreateMoviePoster : CreateMoviePoster[]> {
  // eslint-disable-next-line @security/detect-non-literal-fs-filename
  const imageNames = await readdir(join(import.meta.dirname, 'images'));
  const moviePosters = await Promise.all(
    imageNames.map(async (imageName) => {
      const path = join(import.meta.dirname, 'images', imageName);
      // eslint-disable-next-line @security/detect-non-literal-fs-filename
      const { size } = await stat(path);

      return {
        path,
        mimeType: (await fileType.fileTypeFromFile(path))!.mime,
        size,
      };
    }),
  );

  return (amount === 1 ? moviePosters[0]! : moviePosters) as T extends 1
    ? CreateMoviePoster
    : CreateMoviePoster[];
}

async function generateMoviesSeedData(amount: number) {
  const genresToCreate = [...Array(Math.ceil(amount / 4))].map(() => {
    return { id: randomUUID(), name: randomString(8) };
  });
  let moviesData = (await generateMoviesData(
    genresToCreate.map((genre) => {
      return genre.id;
    }),
    amount,
    // Possible for the generated data to either be an array or not
  )) as CreateMovie | CreateMovie[];
  if (!Array.isArray(moviesData)) {
    moviesData = [moviesData];
  }

  const moviesToCreate = moviesData.map((movieData) => {
    return {
      id: randomUUID(),
      title: movieData.title,
      description: movieData.description,
      price: movieData.price,
      genreId: movieData.genreId,
    };
  });
  const shuffledMovieIds = shuffleArray(
    moviesToCreate.map((movieToCreate) => {
      return movieToCreate.id;
    }),
  );

  // Possible for the generated data to either be an array or not
  let moviePosters = (await generateMoviePostersData(amount)) as
    | CreateMoviePoster
    | CreateMoviePoster[];
  if (!Array.isArray(moviePosters)) {
    moviePosters = [moviePosters];
  }
  const moviePostersToCreate = moviePosters.map((moviePosterToCreate) => {
    return {
      ...moviePosterToCreate,
      movieId: shuffledMovieIds[randomNumber(0, shuffledMovieIds.length - 1)]!,
    };
  });

  return {
    genresToCreate,
    moviesToCreate,
    moviePostersToCreate,
  };
}

function sanitizeSeededMoviesResponse(
  createdEntities: Awaited<ReturnType<typeof generateMoviesSeedData>>,
) {
  const { moviesToCreate, genresToCreate } = createdEntities;

  return moviesToCreate.map((movieToCreate) => {
    const { genreId, ...fields } = {
      ...movieToCreate,
      genre: genresToCreate.find((genre) => {
        return genre.id === movieToCreate.genreId;
      })!.name,
    };

    return fields;
  });
}

async function cleanupCreatedMovies(
  database: ServerParams['database'],
  createdEntities: Awaited<ReturnType<typeof generateMoviesSeedData>>,
) {
  const handler = database.getHandler();
  const {
    movie: movieModel,
    moviePoster: moviePosterModel,
    genre: genreModel,
  } = database.getModels();
  const { moviesToCreate, moviePostersToCreate, genresToCreate } =
    createdEntities;

  await handler.delete(moviePosterModel).where(
    inArray(
      moviePosterModel.movieId,
      moviePostersToCreate.map((moviePosterToCreate) => {
        return moviePosterToCreate.movieId;
      }),
    ),
  );
  await handler.delete(movieModel).where(
    inArray(
      movieModel.id,
      moviesToCreate.map((movieToCreate) => {
        return movieToCreate.id;
      }),
    ),
  );
  await handler.delete(genreModel).where(
    inArray(
      genreModel.id,
      genresToCreate.map((genreToCreate) => {
        return genreToCreate.id;
      }),
    ),
  );
}

async function deleteMovies(serverParams: ServerParams, ...movieIds: string[]) {
  movieIds = movieIds.filter((movieId) => {
    return movieId;
  });
  if (!movieIds.length) {
    return;
  }

  const databaseHandler = serverParams.database.getHandler();
  const { movie: movieModel, moviePoster: moviePosterModel } =
    serverParams.database.getModels();

  // Note: The actual files are written to 'os.tmpdir()' from the tests so there's
  // no need to remove them manually
  await databaseHandler
    .delete(moviePosterModel)
    .where(inArray(moviePosterModel.movieId, movieIds));
  await databaseHandler
    .delete(movieModel)
    .where(inArray(movieModel.id, movieIds));
}

/**********************************************************************************/

export {
  deleteMovies,
  generateMoviePostersData,
  generateMoviesData,
  readFile,
  seedMovie,
  seedMovies,
  type CreateMovie,
  type Movie,
};
