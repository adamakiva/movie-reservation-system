import { inArray } from 'drizzle-orm';

import * as serviceFunctions from '../../src/entities/genre/service/index.js';
import type { Genre } from '../../src/entities/genre/service/utils.js';
import * as validationFunctions from '../../src/entities/genre/validator.js';

import { randomString, VALIDATION, type ServerParams } from '../utils.js';

/**********************************************************************************/

type CreateGenre = Omit<Genre, 'id'>;

const { GENRE } = VALIDATION;

/**********************************************************************************/

async function seedGenre(serverParams: ServerParams) {
  const { createdGenres, genreIds } = await seedGenres(serverParams, 1);

  return {
    createdGenre: createdGenres[0]!,
    genreIds,
  };
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

  return {
    createdGenres,
    genreIds: createdGenres.map(({ id }) => {
      return id;
    }),
  };
}

function generateGenresData(amount = 1) {
  const genres = [...Array(amount)].map(() => {
    return {
      name: randomString(GENRE.NAME.MAX_LENGTH.VALUE - 1),
    } satisfies CreateGenre;
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
  type Genre,
};
