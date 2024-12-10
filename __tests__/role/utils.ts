import assert from 'node:assert/strict';

import { inArray } from 'drizzle-orm';

import type { Role } from '../../src/services/role/utils.js';
import { HTTP_STATUS_CODES } from '../../src/utils/index.js';

import {
  getAdminTokens,
  randomString,
  sendHttpRequest,
  type ServerParams,
} from '../utils.js';

/**********************************************************************************/

type CreateRole = { name: string };

/**********************************************************************************/

function generateRolesData<T extends number = 1>(
  amount = 1 as T,
): T extends 1 ? CreateRole : CreateRole[] {
  const roles = [...Array(amount)].map(() => {
    return {
      name: randomString(16),
    } as CreateRole;
  });

  return (amount === 1 ? roles[0]! : roles) as T extends 1
    ? CreateRole
    : CreateRole[];
}

async function createRole(
  serverParams: ServerParams,
  roleToCreate: CreateRole,
  fn: (
    // eslint-disable-next-line no-unused-vars
    tokens: { accessToken: string; refreshToken: string },
    // eslint-disable-next-line no-unused-vars
    role: Role,
  ) => Promise<unknown>,
) {
  const roleIdsToDelete: string[] = [];

  const adminTokens = await getAdminTokens(serverParams);
  try {
    const [role] = await sendCreateRoleRequest({
      route: `${serverParams.routes.base}/roles`,
      accessToken: adminTokens.accessToken,
      rolesToCreate: [roleToCreate],
      roleIdsToDelete,
    });

    const callbackResponse = await fn(adminTokens, role!);

    return callbackResponse;
  } finally {
    await deleteRoles(serverParams, ...roleIdsToDelete);
  }
}

async function createRoles(
  serverParams: ServerParams,
  rolesToCreate: CreateRole[],
  fn: (
    // eslint-disable-next-line no-unused-vars
    tokens: { accessToken: string; refreshToken: string },
    // eslint-disable-next-line no-unused-vars
    roles: Role[],
  ) => Promise<unknown>,
) {
  const roleIdsToDelete: string[] = [];

  const adminTokens = await getAdminTokens(serverParams);
  try {
    const roles = await sendCreateRoleRequest({
      route: `${serverParams.routes.base}/roles`,
      accessToken: adminTokens.accessToken,
      rolesToCreate,
      roleIdsToDelete,
    });

    const callbackResponse = await fn(adminTokens, roles);

    return callbackResponse;
  } finally {
    await deleteRoles(serverParams, ...roleIdsToDelete);
  }
}

async function sendCreateRoleRequest(params: {
  route: string;
  accessToken: string;
  rolesToCreate: CreateRole[];
  roleIdsToDelete: string[];
}) {
  const { route, accessToken, rolesToCreate, roleIdsToDelete } = params;

  const roles = await Promise.all(
    rolesToCreate.map(async (roleToCreate) => {
      const res = await sendHttpRequest({
        route,
        method: 'POST',
        headers: { Authorization: accessToken },
        payload: roleToCreate,
      });
      assert.strictEqual(res.status, HTTP_STATUS_CODES.CREATED);

      const role = (await res.json()) as Role;
      roleIdsToDelete.push(role.id);

      return role;
    }),
  );

  return roles;
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
  createRole,
  createRoles,
  deleteRoles,
  generateRolesData,
  type CreateRole,
  type Role,
};
