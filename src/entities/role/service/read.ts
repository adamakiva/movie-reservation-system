import { asc, type RequestContext } from '../../../utils/index.js';

import type { Role } from './utils.js';

/**********************************************************************************/

async function getRoles(context: RequestContext): Promise<Role[]> {
  const roles = await readRolesFromDatabase(context.database);

  return roles;
}

/**********************************************************************************/

async function readRolesFromDatabase(database: RequestContext['database']) {
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
