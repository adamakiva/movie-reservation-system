import { type RequestContext, asc } from '../../../utils/index.js';

import type { Hall } from './utils.js';

/**********************************************************************************/

async function getHalls(context: RequestContext): Promise<Hall[]> {
  const halls = await readHallsFromDatabase(context.database);

  return halls;
}

/**********************************************************************************/

async function readHallsFromDatabase(database: RequestContext['database']) {
  const handler = database.getHandler();
  const { hall: hallModel } = database.getModels();

  const halls = await handler
    .select({
      id: hallModel.id,
      name: hallModel.name,
      rows: hallModel.rows,
      columns: hallModel.columns,
    })
    .from(hallModel)
    .orderBy(asc(hallModel.name));

  return halls;
}

/*********************************************************************************/

export { getHalls };
