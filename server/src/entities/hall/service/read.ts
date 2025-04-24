import type { RequestContext } from '../../../utils/types.ts';

import type { Hall } from './utils.ts';

/**********************************************************************************/

async function getHalls(context: RequestContext): Promise<Hall[]> {
  const { database } = context;

  const handler = database.getHandler();
  const { hall: hallModel } = database.getModels();

  return await handler
    .select({
      id: hallModel.id,
      name: hallModel.name,
      rows: hallModel.rows,
      columns: hallModel.columns,
    })
    .from(hallModel);
}

/*********************************************************************************/

export { getHalls };
