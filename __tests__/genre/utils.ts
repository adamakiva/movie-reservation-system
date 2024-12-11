import { inArray } from 'drizzle-orm';

import type { Genre } from '../../src/services/genre/utils.js';

import { randomString, randomUUID, type ServerParams } from '../utils.js';

/**********************************************************************************/

type CreateGenre = { name: string };

/**********************************************************************************/

async function seedGenre(
  serverParams: ServerParams,
  fn: (
    // eslint-disable-next-line no-unused-vars
    createdGenre: Genre,
  ) => Promise<unknown>,
) {
  const { database } = serverParams;
  const handler = database.getHandler();
  const { genre: genreModel } = database.getModels();

  const genresToCreate = generateGenresSeedData(1);

  await handler.insert(genreModel).values(genresToCreate);

  try {
    const callbackResponse = await fn(genresToCreate[0]!);

    return callbackResponse;
  } finally {
    await cleanupCreatedGenres(database, genresToCreate);
  }
}

async function seedGenres(
  serverParams: ServerParams,
  amount: number,
  fn: (
    // eslint-disable-next-line no-unused-vars
    createdGenres: Genre[],
  ) => Promise<unknown>,
) {
  const { database } = serverParams;
  const handler = database.getHandler();
  const { genre: genreModel } = database.getModels();

  const genresToCreate = generateGenresSeedData(amount);

  await handler.insert(genreModel).values(genresToCreate);

  try {
    const callbackResponse = await fn(genresToCreate);

    return callbackResponse;
  } finally {
    await cleanupCreatedGenres(database, genresToCreate);
  }
}

function generateGenresData<T extends number = 1>(
  amount = 1 as T,
): T extends 1 ? CreateGenre : CreateGenre[] {
  const genres = [...Array(amount)].map(() => {
    return {
      name: randomString(8),
    } as CreateGenre;
  });

  return (amount === 1 ? genres[0]! : genres) as T extends 1
    ? CreateGenre
    : CreateGenre[];
}

function generateGenresSeedData(amount: number) {
  let genresData = generateGenresData(amount) as CreateGenre | CreateGenre[];
  if (!Array.isArray(genresData)) {
    genresData = [genresData];
  }

  const genresToCreate = genresData.map((genreData) => {
    return {
      id: randomUUID(),
      ...genreData,
    };
  });

  return genresToCreate;
}

async function cleanupCreatedGenres(
  database: ServerParams['database'],
  createdGenres: Awaited<ReturnType<typeof generateGenresSeedData>>,
) {
  const handler = database.getHandler();
  const { genre: genreModel } = database.getModels();

  await handler.delete(genreModel).where(
    inArray(
      genreModel.id,
      createdGenres.map((genreToCreate) => {
        return genreToCreate.id;
      }),
    ),
  );
}

async function deleteGenres(serverParams: ServerParams, ...genreIds: string[]) {
  genreIds = genreIds.filter((genreId) => {
    return genreId;
  });
  if (!genreIds.length) {
    return;
  }

  const databaseHandler = serverParams.database.getHandler();
  const { genre: genreModel } = serverParams.database.getModels();

  await databaseHandler
    .delete(genreModel)
    .where(inArray(genreModel.id, genreIds));
}

/**********************************************************************************/

export {
  deleteGenres,
  generateGenresData,
  seedGenre,
  seedGenres,
  type CreateGenre,
  type Genre,
};
