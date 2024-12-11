import { inArray } from 'drizzle-orm';

import type { Role } from '../../src/entities/role/service/utils.js';

import { randomString, randomUUID, type ServerParams } from '../utils.js';

/**********************************************************************************/

type CreateRole = { name: string };

/**********************************************************************************/

async function seedRole(
  serverParams: ServerParams,
  fn: (
    // eslint-disable-next-line no-unused-vars
    createdRole: Role,
  ) => Promise<unknown>,
) {
  const { database } = serverParams;
  const handler = database.getHandler();
  const { role: roleModel } = database.getModels();

  const rolesToCreate = generateRolesSeedData(1);

  await handler.insert(roleModel).values(rolesToCreate);

  try {
    const callbackResponse = await fn(rolesToCreate[0]!);

    return callbackResponse;
  } finally {
    await cleanupCreatedRoles(database, rolesToCreate);
  }
}

async function seedRoles(
  serverParams: ServerParams,
  amount: number,
  fn: (
    // eslint-disable-next-line no-unused-vars
    createdRoles: Role[],
  ) => Promise<unknown>,
) {
  const { database } = serverParams;
  const handler = database.getHandler();
  const { role: roleModel } = database.getModels();

  const rolesToCreate = generateRolesSeedData(amount);

  await handler.insert(roleModel).values(rolesToCreate);

  try {
    const callbackResponse = await fn(rolesToCreate);

    return callbackResponse;
  } finally {
    await cleanupCreatedRoles(database, rolesToCreate);
  }
}

function generateRolesData<T extends number = 1>(
  amount = 1 as T,
): T extends 1 ? CreateRole : CreateRole[] {
  const roles = [...Array(amount)].map(() => {
    return {
      name: randomString(8),
    } as CreateRole;
  });

  return (amount === 1 ? roles[0]! : roles) as T extends 1
    ? CreateRole
    : CreateRole[];
}

function generateRolesSeedData(amount: number) {
  let rolesData = generateRolesData(amount) as CreateRole | CreateRole[];
  if (!Array.isArray(rolesData)) {
    rolesData = [rolesData];
  }

  const rolesToCreate = rolesData.map((roleData) => {
    return {
      id: randomUUID(),
      ...roleData,
    };
  });

  return rolesToCreate;
}

async function cleanupCreatedRoles(
  database: ServerParams['database'],
  createdRoles: Awaited<ReturnType<typeof generateRolesSeedData>>,
) {
  const handler = database.getHandler();
  const { role: roleModel } = database.getModels();

  await handler.delete(roleModel).where(
    inArray(
      roleModel.id,
      createdRoles.map((roleToCreate) => {
        return roleToCreate.id;
      }),
    ),
  );
}

async function deleteRoles(serverParams: ServerParams, ...roleIds: string[]) {
  roleIds = roleIds.filter((roleId) => {
    return roleId;
  });
  if (!roleIds.length) {
    return;
  }

  const databaseHandler = serverParams.database.getHandler();
  const { role: roleModel } = serverParams.database.getModels();

  await databaseHandler.delete(roleModel).where(inArray(roleModel.id, roleIds));
}

/**********************************************************************************/

export {
  deleteRoles,
  generateRolesData,
  seedRole,
  seedRoles,
  type CreateRole,
  type Role,
};
