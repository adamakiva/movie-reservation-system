/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import {
  after,
  assert,
  before,
  clearDatabase,
  CONSTANTS,
  getAdminTokens,
  HTTP_STATUS_CODES,
  initServer,
  randomAlphaNumericString,
  randomUUID,
  sendHttpRequest,
  suite,
  terminateServer,
  test,
  type ServerParams,
} from '../utils.ts';

import { generateRolesData, seedRole, seedRoles, type Role } from './utils.ts';

/**********************************************************************************/

await suite('Role integration tests', async () => {
  let serverParams: ServerParams = null!;
  before(async () => {
    serverParams = await initServer();
  });
  after(() => {
    terminateServer(serverParams);
  });

  await test('Valid - Read many', async () => {
    const { accessToken } = await getAdminTokens(serverParams);
    const createdRoles = await seedRoles(serverParams, 32);

    try {
      const { statusCode, responseBody: fetchedRoles } = await sendHttpRequest<
        'GET',
        'json',
        Role[]
      >({
        route: `${serverParams.routes.http}/roles`,
        method: 'GET',
        headers: { Authorization: accessToken },
        responseType: 'json',
      });
      assert.strictEqual(statusCode, HTTP_STATUS_CODES.SUCCESS);

      createdRoles.forEach((role) => {
        const matchingRole = fetchedRoles.find((fetchedRole) => {
          return fetchedRole.id === role.id;
        });

        assert.deepStrictEqual(role, matchingRole);
      });
    } finally {
      await clearDatabase(serverParams.database);
    }
  });
  await test('Valid - Read a lot', async () => {
    const { accessToken } = await getAdminTokens(serverParams);
    const createdRoles = await seedRoles(serverParams, 8_192);

    try {
      const { statusCode, responseBody: fetchedRoles } = await sendHttpRequest<
        'GET',
        'json',
        Role[]
      >({
        route: `${serverParams.routes.http}/roles`,
        method: 'GET',
        headers: { Authorization: accessToken },
        responseType: 'json',
      });
      assert.strictEqual(statusCode, HTTP_STATUS_CODES.SUCCESS);

      createdRoles.forEach((role) => {
        const matchingRole = fetchedRoles.find((fetchedRole) => {
          return fetchedRole.id === role.id;
        });

        assert.deepStrictEqual(role, matchingRole);
      });
    } finally {
      await clearDatabase(serverParams.database);
    }
  });
  await test('Invalid - Create request with excess size', async () => {
    const { accessToken } = await getAdminTokens(serverParams);

    const { statusCode } = await sendHttpRequest<'POST'>({
      route: `${serverParams.routes.http}/roles`,
      method: 'POST',
      headers: { Authorization: accessToken },
      payload: {
        name: randomAlphaNumericString(CONSTANTS.ONE_MEGABYTE),
      },
      responseType: 'bytes',
    });

    assert.strictEqual(statusCode, HTTP_STATUS_CODES.CONTENT_TOO_LARGE);
  });
  await test('Valid - Create', async () => {
    const { accessToken } = await getAdminTokens(serverParams);

    const roleData = generateRolesData()[0]!;

    try {
      const {
        statusCode,
        responseBody: { id, ...fields },
      } = await sendHttpRequest<'POST', 'json', Role>({
        route: `${serverParams.routes.http}/roles`,
        method: 'POST',
        headers: { Authorization: accessToken },
        payload: roleData,
        responseType: 'json',
      });
      assert.strictEqual(statusCode, HTTP_STATUS_CODES.CREATED);

      assert.strictEqual(typeof id === 'string', true);
      assert.deepStrictEqual(
        { ...roleData, name: roleData.name.toLowerCase() },
        fields,
      );
    } finally {
      await clearDatabase(serverParams.database);
    }
  });
  await test('Invalid - Update request with excess size', async () => {
    const { accessToken } = await getAdminTokens(serverParams);

    const { statusCode } = await sendHttpRequest<'PUT'>({
      route: `${serverParams.routes.http}/roles/${randomUUID()}`,
      method: 'PUT',
      headers: { Authorization: accessToken },
      payload: {
        name: randomAlphaNumericString(CONSTANTS.ONE_MEGABYTE),
      },
      responseType: 'bytes',
    });

    assert.strictEqual(statusCode, HTTP_STATUS_CODES.CONTENT_TOO_LARGE);
  });
  await test('Valid - Update', async () => {
    const { accessToken } = await getAdminTokens(serverParams);
    const createdRole = await seedRole(serverParams);

    const updatedRoleData = generateRolesData()[0]!;

    try {
      const { statusCode, responseBody: updatedRole } = await sendHttpRequest<
        'PUT',
        'json',
        Role
      >({
        route: `${serverParams.routes.http}/roles/${createdRole.id}`,
        method: 'PUT',
        headers: { Authorization: accessToken },
        payload: updatedRoleData,
        responseType: 'json',
      });
      assert.strictEqual(statusCode, HTTP_STATUS_CODES.SUCCESS);

      assert.deepStrictEqual(
        {
          ...createdRole,
          ...{
            ...updatedRoleData,
            name: updatedRoleData.name.toLowerCase(),
          },
        },
        updatedRole,
      );
    } finally {
      await clearDatabase(serverParams.database);
    }
  });
  await test('Valid - Delete existent role', async () => {
    let roleId = '';

    const { accessToken } = await getAdminTokens(serverParams);

    const roleData = generateRolesData()[0]!;

    try {
      const {
        statusCode,
        responseBody: { id },
      } = await sendHttpRequest<'POST', 'json', Role>({
        route: `${serverParams.routes.http}/roles`,
        method: 'POST',
        headers: { Authorization: accessToken },
        payload: roleData,
        responseType: 'json',
      });
      assert.strictEqual(statusCode, HTTP_STATUS_CODES.CREATED);
      roleId = id;

      const result = await sendHttpRequest<'DELETE', 'text', string>({
        route: `${serverParams.routes.http}/roles/${roleId}`,
        method: 'DELETE',
        headers: { Authorization: accessToken },
        responseType: 'text',
      });

      assert.strictEqual(result.statusCode, HTTP_STATUS_CODES.NO_CONTENT);
      assert.strictEqual(result.responseBody, '');
    } finally {
      await clearDatabase(serverParams.database);
    }
  });
  await test('Valid - Delete non-existent role', async () => {
    const { accessToken } = await getAdminTokens(serverParams);

    const { statusCode, responseBody } = await sendHttpRequest<
      'DELETE',
      'text',
      string
    >({
      route: `${serverParams.routes.http}/roles/${randomUUID()}`,
      method: 'DELETE',
      headers: { Authorization: accessToken },
      responseType: 'text',
    });

    assert.strictEqual(statusCode, HTTP_STATUS_CODES.NO_CONTENT);
    assert.strictEqual(responseBody, '');
  });
});
