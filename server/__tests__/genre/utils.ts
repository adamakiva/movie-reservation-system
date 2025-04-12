import * as serviceFunctions from '../../src/entities/genre/service/index.ts';
import type { Genre } from '../../src/entities/genre/service/utils.ts';
import * as validationFunctions from '../../src/entities/genre/validator.ts';
import { GENRE } from '../../src/entities/genre/validator.ts';

import { randomAlphaNumericString, type ServerParams } from '../utils.ts';

/**********************************************************************************/

type CreateGenre = Omit<Genre, 'id'>;

/**********************************************************************************/

async function seedGenre(serverParams: ServerParams) {
  const [createdGenre] = await seedGenres(serverParams, 1);

  return createdGenre!;
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
  const genres = [...Array<CreateGenre>(amount)].map(() => {
    return {
      name: randomAlphaNumericString(GENRE.NAME.MAX_LENGTH.VALUE - 1),
    } satisfies CreateGenre;
  });

  return genres;
}

/**********************************************************************************/

export {
  generateGenresData,
  GENRE,
  seedGenre,
  seedGenres,
  serviceFunctions,
  validationFunctions,
  type Genre,
};
