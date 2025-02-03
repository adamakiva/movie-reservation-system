import { asc } from 'drizzle-orm';

import type { RequestContext } from '../../../utils/index.ts';

import type { Hall } from './utils.ts';

/**********************************************************************************/

async function getHalls(context: RequestContext): Promise<Hall[]> {
  const { database } = context;
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
