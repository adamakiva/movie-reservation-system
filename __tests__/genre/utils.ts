import assert from 'node:assert/strict';

import { inArray } from 'drizzle-orm';

import type { Genre } from '../../src/services/genre/utils.js';
import { HTTP_STATUS_CODES } from '../../src/utils/index.js';

import {
  getAdminTokens,
  randomString,
  sendHttpRequest,
  type ServerParams,
} from '../utils.js';

/**********************************************************************************/

type CreateGenre = { name: string };

/**********************************************************************************/

function generateGenresData<T extends number = 1>(
  amount = 1 as T,
): T extends 1 ? CreateGenre : CreateGenre[] {
  const roles = [...Array(amount)].map(() => {
    return {
      name: randomString(16),
    } as CreateGenre;
  });

  return (amount === 1 ? roles[0]! : roles) as T extends 1
    ? CreateGenre
    : CreateGenre[];
}

async function createGenre(
  serverParams: ServerParams,
  genreToCreate: CreateGenre,
  fn: (
    // eslint-disable-next-line no-unused-vars
    tokens: { accessToken: string; refreshToken: string },
    // eslint-disable-next-line no-unused-vars
    genre: Genre,
  ) => Promise<unknown>,
) {
  const genreIdsToDelete: string[] = [];

  const adminTokens = await getAdminTokens(serverParams);
  try {
    const [genre] = await sendCreateGenreRequest({
      route: `${serverParams.routes.base}/genres`,
      accessToken: adminTokens.accessToken,
      genresToCreate: [genreToCreate],
      genreIdsToDelete,
    });

    const callbackResponse = await fn(adminTokens, genre!);

    return callbackResponse;
  } finally {
    await deleteGenres(serverParams, ...genreIdsToDelete);
  }
}

async function createGenres(
  serverParams: ServerParams,
  genresToCreate: CreateGenre[],
  fn: (
    // eslint-disable-next-line no-unused-vars
    tokens: { accessToken: string; refreshToken: string },
    // eslint-disable-next-line no-unused-vars
    genres: Genre[],
  ) => Promise<unknown>,
) {
  const genreIdsToDelete: string[] = [];

  const adminTokens = await getAdminTokens(serverParams);
  try {
    const genres = await sendCreateGenreRequest({
      route: `${serverParams.routes.base}/genres`,
      accessToken: adminTokens.accessToken,
      genresToCreate,
      genreIdsToDelete,
    });

    const callbackResponse = await fn(adminTokens, genres);

    return callbackResponse;
  } finally {
    await deleteGenres(serverParams, ...genreIdsToDelete);
  }
}

async function sendCreateGenreRequest(params: {
  route: string;
  accessToken: string;
  genresToCreate: CreateGenre[];
  genreIdsToDelete: string[];
}) {
  const { route, accessToken, genresToCreate, genreIdsToDelete } = params;

  const genres = await Promise.all(
    genresToCreate.map(async (genreToCreate) => {
      const res = await sendHttpRequest({
        route,
        method: 'POST',
        headers: { Authorization: accessToken },
        payload: genreToCreate,
      });
      assert.strictEqual(res.status, HTTP_STATUS_CODES.CREATED);

      const genre = (await res.json()) as Genre;
      genreIdsToDelete.push(genre.id);

      return genre;
    }),
  );

  return genres;
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
  createGenre,
  createGenres,
  deleteGenres,
  generateGenresData,
  type CreateGenre,
  type Genre,
};
