import * as serviceFunctions from '../../src/entities/hall/service/index.ts';
import type { Hall } from '../../src/entities/hall/service/utils.ts';
import * as validationFunctions from '../../src/entities/hall/validator.ts';

import {
  randomAlphaNumericString,
  randomNumber,
  type ServerParams,
  VALIDATION,
} from '../utils.ts';

const { HALL } = VALIDATION;

/**********************************************************************************/

type CreateHall = Omit<Hall, 'id'>;

/**********************************************************************************/

async function seedHall(serverParams: ServerParams) {
  const [createdHall] = await seedHalls(serverParams, 1);

  return createdHall!;
}

async function seedHalls(serverParams: ServerParams, amount: number) {
  const { database } = serverParams;
  const handler = database.getHandler();
  const { hall: hallModel } = database.getModels();

  const hallsToCreate = generateHallsData(amount);

  const createdHalls = await handler
    .insert(hallModel)
    .values(hallsToCreate)
    .returning({
      id: hallModel.id,
      name: hallModel.name,
      rows: hallModel.rows,
      columns: hallModel.columns,
    });

  return createdHalls;
}

function generateHallsData(amount = 1) {
  const halls = [...Array(amount)].map(() => {
    return {
      name: randomAlphaNumericString(HALL.NAME.MAX_LENGTH.VALUE - 1),
      rows: randomNumber(
        HALL.ROWS.MIN_LENGTH.VALUE + 1,
        HALL.ROWS.MAX_LENGTH.VALUE - 1,
      ),
      columns: randomNumber(
        HALL.COLUMNS.MIN_LENGTH.VALUE + 1,
        HALL.COLUMNS.MAX_LENGTH.VALUE - 1,
      ),
    } satisfies CreateHall;
  });

  return halls;
}

/**********************************************************************************/

export {
  generateHallsData,
  seedHall,
  seedHalls,
  serviceFunctions,
  validationFunctions,
  type Hall,
};
