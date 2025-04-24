import type { RequestContext } from '../../../utils/types.ts';

import type { Role } from './utils.ts';

/**********************************************************************************/

async function getRoles(context: RequestContext): Promise<Role[]> {
  const { database } = context;

  const handler = database.getHandler();
  const { role: roleModel } = database.getModels();

  return await handler
    .select({ id: roleModel.id, name: roleModel.name })
    .from(roleModel);
}

/**********************************************************************************/

export { getRoles };
