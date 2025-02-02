import { asc } from 'drizzle-orm';

import type { RequestContext } from '../../../utils/index.js';

import type { Role } from './utils.js';

/**********************************************************************************/

async function getRoles(context: RequestContext): Promise<Role[]> {
  const { database } = context;
  const handler = database.getHandler();
  const { role: roleModel } = database.getModels();

  const roles = await handler
    .select({ id: roleModel.id, name: roleModel.name })
    .from(roleModel)
    .orderBy(asc(roleModel.name));

  return roles;
}

/**********************************************************************************/

export { getRoles };
