import { inArray } from 'drizzle-orm';

import type { Genre } from '../../src/entities/genre/service/utils.js';
import type { Movie } from '../../src/entities/movie/service/utils.js';

import {
  randomNumber,
  randomString,
  randomUUID,
  type ServerParams,
} from '../utils.js';

/**********************************************************************************/

type CreateMovie = {
  title: string;
  description: string;
  price: number;
  genreId: string;
};

/**********************************************************************************/

async function seedMovie(
  serverParams: ServerParams,
  fn: (
    // eslint-disable-next-line no-unused-vars
    createdMovie: Movie,
    // eslint-disable-next-line no-unused-vars
    genre: Genre,
  ) => Promise<unknown>,
) {
  const { database } = serverParams;
  const handler = database.getHandler();
  const { movie: movieModel, genre: genreModel } = database.getModels();

  const entitiesToCreate = generateMoviesSeedData(1);

  // This can be inside a transaction but for the same reason the delete
  // in the finally block may fail as well, resulting in the same effect
  await handler.insert(genreModel).values(entitiesToCreate.genresToCreate);
  await handler.insert(movieModel).values(entitiesToCreate.moviesToCreate);

  try {
    const callbackResponse = await fn(
      sanitizeSeededMoviesResponse(entitiesToCreate)[0]!,
      entitiesToCreate.genresToCreate[0]!,
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
  const { movie: movieModel, genre: genreModel } = database.getModels();

  const entitiesToCreate = generateMoviesSeedData(amount);

  // This can be inside a transaction but for the same reason the delete
  // in the finally block may fail as well, resulting in the same effect
  await handler.insert(genreModel).values(entitiesToCreate.genresToCreate);
  await handler.insert(movieModel).values(entitiesToCreate.moviesToCreate);

  try {
    const callbackResponse = await fn(
      sanitizeSeededMoviesResponse(entitiesToCreate),
    );

    return callbackResponse;
  } finally {
    await cleanupCreatedMovies(database, entitiesToCreate);
  }
}

function generateMoviesData<T extends number = 1>(
  genreIds: string[],
  amount = 1 as T,
): T extends 1 ? CreateMovie : CreateMovie[] {
  const movies = [...Array(amount)].map(() => {
    return {
      title: randomString(16),
      description: randomString(256),
      price: randomNumber(0, 99),
      genreId: genreIds[randomNumber(0, genreIds.length - 1)],
    } as CreateMovie;
  });

  return (amount === 1 ? movies[0]! : movies) as T extends 1
    ? CreateMovie
    : CreateMovie[];
}

function generateMoviesSeedData(amount: number) {
  const genresToCreate = [...Array(Math.ceil(amount / 4))].map(() => {
    return { id: randomUUID(), name: randomString(8) };
  });
  let moviesData = generateMoviesData(
    genresToCreate.map((genre) => {
      return genre.id;
    }),
    amount,
  ) as CreateMovie | CreateMovie[];
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

  return {
    genresToCreate,
    moviesToCreate,
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
  const { movie: movieModel, genre: genreModel } = database.getModels();
  const { moviesToCreate, genresToCreate } = createdEntities;

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
  const { movie: movieModel } = serverParams.database.getModels();

  await databaseHandler
    .delete(movieModel)
    .where(inArray(movieModel.id, movieIds));
}

/**********************************************************************************/

export {
  deleteMovies,
  generateMoviesData,
  seedMovie,
  seedMovies,
  type CreateMovie,
  type Movie,
};
