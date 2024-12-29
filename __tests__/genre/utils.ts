import { inArray } from 'drizzle-orm';

import * as serviceFunctions from '../../src/entities/genre/service/index.js';
import type { Genre } from '../../src/entities/genre/service/utils.js';
import * as validationFunctions from '../../src/entities/genre/validator.js';

import { randomString, type ServerParams } from '../utils.js';

/**********************************************************************************/

type CreateGenre = Omit<Genre, 'id'>;

/**********************************************************************************/

async function seedGenre(serverParams: ServerParams) {
  return (await seedGenres(serverParams, 1))[0]!;
}

async function seedGenres(serverParams: ServerParams, amount: number) {
  const { database } = serverParams;
  const handler = database.getHandler();
  const { genre: genreModel } = database.getModels();

  const genresToCreate = generateGenresData(amount);

  const createdGenres = await handler
    .insert(genreModel)
    .values(genresToCreate)
    .returning({ id: genreModel.id, name: genreModel.name });

  return createdGenres;
}

function generateGenresData(amount = 1) {
  const genres = [...Array(amount)].map(() => {
    return {
      name: randomString(8),
    } as CreateGenre;
  });

  return genres;
}

async function deleteGenres(serverParams: ServerParams, ...genreIds: string[]) {
  genreIds = genreIds.filter((genreId) => {
    return genreId;
  });
  if (!genreIds.length) {
    return;
  }

  const { database } = serverParams;
  const handler = database.getHandler();
  const { genre: genreModel } = database.getModels();

  await handler.delete(genreModel).where(inArray(genreModel.id, genreIds));
}

/**********************************************************************************/

export {
  deleteGenres,
  generateGenresData,
  seedGenre,
  seedGenres,
  serviceFunctions,
  validationFunctions,
  type CreateGenre,
  type Genre,
};
