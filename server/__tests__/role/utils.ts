import * as serviceFunctions from '../../src/entities/role/service/index.ts';
import type { Role } from '../../src/entities/role/service/utils.ts';
import * as validationFunctions from '../../src/entities/role/validator.ts';

import {
  randomAlphaNumericString,
  VALIDATION,
  type ServerParams,
} from '../utils.ts';

/**********************************************************************************/

type CreateRole = Omit<Role, 'id'>;

const { ROLE } = VALIDATION;

/**********************************************************************************/

async function seedRole(serverParams: ServerParams) {
  const [createdRole] = await seedRoles(serverParams, 1);

  return createdRole!;
}

async function seedRoles(serverParams: ServerParams, amount: number) {
  const { database } = serverParams;
  const handler = database.getHandler();
  const { role: roleModel } = database.getModels();

  const rolesToCreate = generateRolesData(amount);

  const createdRoles = await handler
    .insert(roleModel)
    .values(rolesToCreate)
    .returning({ id: roleModel.id, name: roleModel.name });

  return createdRoles;
}

function generateRolesData(amount = 1) {
  const roles = [...Array<CreateRole>(amount)].map(() => {
    return {
      name: randomAlphaNumericString(ROLE.NAME.MAX_LENGTH.VALUE - 1),
    } satisfies CreateRole;
  });

  return roles;
}

/**********************************************************************************/

export {
  generateRolesData,
  seedRole,
  seedRoles,
  serviceFunctions,
  validationFunctions,
  type CreateRole,
  type Role,
};
