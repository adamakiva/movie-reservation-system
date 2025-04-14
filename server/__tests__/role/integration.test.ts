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
      const res = await sendHttpRequest({
        route: `${serverParams.routes.http}/roles`,
        method: 'GET',
        headers: { Authorization: accessToken },
      });
      assert.strictEqual(res.status, HTTP_STATUS_CODES.SUCCESS);

      const fetchedRoles = (await res.json()) as Role[];
      createdRoles.forEach((role) => {
        const matchingRole = fetchedRoles.find((fetchedRole) => {
          return fetchedRole.id === role.id;
        });

        assert.deepStrictEqual(role, matchingRole);
      });
    } finally {
      await clearDatabase(serverParams);
    }
  });
  await test('Valid - Read a lot', async () => {
    const { accessToken } = await getAdminTokens(serverParams);
    const createdRoles = await seedRoles(serverParams, 8_192);

    try {
      const res = await sendHttpRequest({
        route: `${serverParams.routes.http}/roles`,
        method: 'GET',
        headers: { Authorization: accessToken },
      });
      assert.strictEqual(res.status, HTTP_STATUS_CODES.SUCCESS);

      const fetchedRoles = (await res.json()) as Role[];
      createdRoles.forEach((role) => {
        const matchingRole = fetchedRoles.find((fetchedRole) => {
          return fetchedRole.id === role.id;
        });

        assert.deepStrictEqual(role, matchingRole);
      });
    } finally {
      await clearDatabase(serverParams);
    }
  });
  await test('Invalid - Create request with excess size', async () => {
    const { accessToken } = await getAdminTokens(serverParams);

    const { status } = await sendHttpRequest({
      route: `${serverParams.routes.http}/roles`,
      method: 'POST',
      headers: { Authorization: accessToken },
      payload: {
        name: randomAlphaNumericString(CONSTANTS.ONE_MEGABYTE),
      },
    });

    assert.strictEqual(status, HTTP_STATUS_CODES.CONTENT_TOO_LARGE);
  });
  await test('Valid - Create', async () => {
    const { accessToken } = await getAdminTokens(serverParams);

    const roleData = generateRolesData()[0]!;

    try {
      const res = await sendHttpRequest({
        route: `${serverParams.routes.http}/roles`,
        method: 'POST',
        headers: { Authorization: accessToken },
        payload: roleData,
      });
      assert.strictEqual(res.status, HTTP_STATUS_CODES.CREATED);

      const { id, ...fields } = (await res.json()) as Role;
      assert.strictEqual(typeof id === 'string', true);
      assert.deepStrictEqual(
        { ...roleData, name: roleData.name.toLowerCase() },
        fields,
      );
    } finally {
      await clearDatabase(serverParams);
    }
  });
  await test('Invalid - Update request with excess size', async () => {
    const { accessToken } = await getAdminTokens(serverParams);

    const { status } = await sendHttpRequest({
      route: `${serverParams.routes.http}/roles/${randomUUID()}`,
      method: 'PUT',
      headers: { Authorization: accessToken },
      payload: {
        name: randomAlphaNumericString(CONSTANTS.ONE_MEGABYTE),
      },
    });

    assert.strictEqual(status, HTTP_STATUS_CODES.CONTENT_TOO_LARGE);
  });
  await test('Valid - Update', async () => {
    const { accessToken } = await getAdminTokens(serverParams);
    const createdRole = await seedRole(serverParams);

    const updatedRoleData = generateRolesData()[0]!;

    try {
      const res = await sendHttpRequest({
        route: `${serverParams.routes.http}/roles/${createdRole.id}`,
        method: 'PUT',
        headers: { Authorization: accessToken },
        payload: updatedRoleData,
      });
      assert.strictEqual(res.status, HTTP_STATUS_CODES.SUCCESS);

      const updatedRole = await res.json();
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
      await clearDatabase(serverParams);
    }
  });
  await test('Valid - Delete existent role', async () => {
    let roleId = '';

    const { accessToken } = await getAdminTokens(serverParams);

    const roleData = generateRolesData()[0]!;

    try {
      let res = await sendHttpRequest({
        route: `${serverParams.routes.http}/roles`,
        method: 'POST',
        headers: { Authorization: accessToken },
        payload: roleData,
      });
      assert.strictEqual(res.status, HTTP_STATUS_CODES.CREATED);

      ({ id: roleId } = (await res.json()) as Role);

      res = await sendHttpRequest({
        route: `${serverParams.routes.http}/roles/${roleId}`,
        method: 'DELETE',
        headers: { Authorization: accessToken },
      });

      const responseBody = await res.text();

      assert.strictEqual(res.status, HTTP_STATUS_CODES.NO_CONTENT);
      assert.strictEqual(responseBody, '');
    } finally {
      await clearDatabase(serverParams);
    }
  });
  await test('Valid - Delete non-existent role', async () => {
    const { accessToken } = await getAdminTokens(serverParams);

    const res = await sendHttpRequest({
      route: `${serverParams.routes.http}/roles/${randomUUID()}`,
      method: 'DELETE',
      headers: { Authorization: accessToken },
    });

    const responseBody = await res.text();

    assert.strictEqual(res.status, HTTP_STATUS_CODES.NO_CONTENT);
    assert.strictEqual(responseBody, '');
  });
});
