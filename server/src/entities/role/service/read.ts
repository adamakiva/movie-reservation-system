import { asc } from 'drizzle-orm';

import type { RequestContext } from '../../../utils/index.ts';

import type { Role } from './utils.ts';

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
