/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import {
  after,
  assert,
  before,
  clearDatabase,
  CONSTANTS,
  generateRolesData,
  getAdminTokens,
  HTTP_STATUS_CODES,
  initServer,
  randomAlphaNumericString,
  randomUUID,
  seedRole,
  seedRoles,
  sendHttpRequest,
  suite,
  terminateServer,
  test,
  type Role,
  type ServerParams,
} from '../../tests/utils.ts';

/**********************************************************************************/

await suite('Role integration tests', async () => {
  let server: ServerParams['server'] = null!;
  let database: ServerParams['database'] = null!;
  let httpRoute: ServerParams['routes']['http'] = null!;
  before(async () => {
    ({
      server,
      database,
      routes: { http: httpRoute },
    } = await initServer());
  });
  after(async () => {
    await terminateServer(server);
  });

  await test('Valid - Read many', async () => {
    const { accessToken } = await getAdminTokens(httpRoute);
    const createdRoles = await seedRoles(database, 32);

    try {
      const { statusCode, responseBody: fetchedRoles } = await sendHttpRequest<
        'GET',
        'json',
        Role[]
      >({
        route: `${httpRoute}/roles`,
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
      await clearDatabase(database);
    }
  });
  await test('Valid - Read a lot', async () => {
    const { accessToken } = await getAdminTokens(httpRoute);
    const createdRoles = await seedRoles(database, 8_192);

    try {
      const { statusCode, responseBody: fetchedRoles } = await sendHttpRequest<
        'GET',
        'json',
        Role[]
      >({
        route: `${httpRoute}/roles`,
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
      await clearDatabase(database);
    }
  });
  await test('Invalid - Create request with excess size', async () => {
    const { accessToken } = await getAdminTokens(httpRoute);

    const { statusCode } = await sendHttpRequest<'POST'>({
      route: `${httpRoute}/roles`,
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
    const { accessToken } = await getAdminTokens(httpRoute);

    const roleData = generateRolesData()[0]!;

    try {
      const {
        statusCode,
        responseBody: { id, ...fields },
      } = await sendHttpRequest<'POST', 'json', Role>({
        route: `${httpRoute}/roles`,
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
      await clearDatabase(database);
    }
  });
  await test('Invalid - Update request with excess size', async () => {
    const { accessToken } = await getAdminTokens(httpRoute);

    const { statusCode } = await sendHttpRequest<'PUT'>({
      route: `${httpRoute}/roles/${randomUUID()}`,
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
    const { accessToken } = await getAdminTokens(httpRoute);
    const createdRole = await seedRole(database);

    const updatedRoleData = generateRolesData()[0]!;

    try {
      const { statusCode, responseBody: updatedRole } = await sendHttpRequest<
        'PUT',
        'json',
        Role
      >({
        route: `${httpRoute}/roles/${createdRole.id}`,
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
      await clearDatabase(database);
    }
  });
  await test('Valid - Delete existent role', async () => {
    let roleId = '';

    const { accessToken } = await getAdminTokens(httpRoute);

    const roleData = generateRolesData()[0]!;

    try {
      const {
        statusCode,
        responseBody: { id },
      } = await sendHttpRequest<'POST', 'json', Role>({
        route: `${httpRoute}/roles`,
        method: 'POST',
        headers: { Authorization: accessToken },
        payload: roleData,
        responseType: 'json',
      });
      assert.strictEqual(statusCode, HTTP_STATUS_CODES.CREATED);
      roleId = id;

      const result = await sendHttpRequest<'DELETE', 'text', string>({
        route: `${httpRoute}/roles/${roleId}`,
        method: 'DELETE',
        headers: { Authorization: accessToken },
        responseType: 'text',
      });

      assert.strictEqual(result.statusCode, HTTP_STATUS_CODES.NO_CONTENT);
      assert.strictEqual(result.responseBody, '');
    } finally {
      await clearDatabase(database);
    }
  });
  await test('Valid - Delete non-existent role', async () => {
    const { accessToken } = await getAdminTokens(httpRoute);

    const { statusCode, responseBody } = await sendHttpRequest<
      'DELETE',
      'text',
      string
    >({
      route: `${httpRoute}/roles/${randomUUID()}`,
      method: 'DELETE',
      headers: { Authorization: accessToken },
      responseType: 'text',
    });

    assert.strictEqual(statusCode, HTTP_STATUS_CODES.NO_CONTENT);
    assert.strictEqual(responseBody, '');
  });
});
