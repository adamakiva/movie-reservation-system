import { inArray } from 'drizzle-orm';

import * as serviceFunctions from '../../src/entities/hall/service/index.js';
import type { Hall } from '../../src/entities/hall/service/utils.js';
import * as validationFunctions from '../../src/entities/hall/validator.js';

import {
  randomNumber,
  randomString,
  type ServerParams,
  VALIDATION,
} from '../utils.js';

const { HALL } = VALIDATION;

/**********************************************************************************/

type CreateHall = Omit<Hall, 'id'>;

/**********************************************************************************/

async function seedHall(serverParams: ServerParams) {
  const { createdHalls, hallIds } = await seedHalls(serverParams, 1);

  return {
    createdHall: createdHalls[0]!,
    hallIds,
  };
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

  return {
    createdHalls,
    hallIds: createdHalls.map(({ id }) => {
      return id;
    }),
  };
}

function generateHallsData(amount = 1) {
  const halls = [...Array(amount)].map(() => {
    return {
      name: randomString(HALL.NAME.MAX_LENGTH.VALUE - 1),
      rows: randomNumber(
        HALL.ROWS.MIN_LENGTH.VALUE + 1,
        HALL.ROWS.MAX_LENGTH.VALUE - 1,
      ),
      columns: randomNumber(
        HALL.COLUMNS.MIN_LENGTH.VALUE + 1,
        HALL.COLUMNS.MAX_LENGTH.VALUE - 1,
      ),
    } as CreateHall;
  });

  return halls;
}

async function deleteHalls(serverParams: ServerParams, ...hallIds: string[]) {
  hallIds = hallIds.filter((hallId) => {
    return hallId;
  });
  if (!hallIds.length) {
    return;
  }

  const { database } = serverParams;
  const handler = database.getHandler();
  const { hall: hallModel } = database.getModels();

  await handler.delete(hallModel).where(inArray(hallModel.id, hallIds));
}

/**********************************************************************************/

export {
  deleteHalls,
  generateHallsData,
  seedHall,
  seedHalls,
  serviceFunctions,
  validationFunctions,
  type Hall,
};
