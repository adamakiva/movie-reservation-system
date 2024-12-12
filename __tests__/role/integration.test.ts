import {
  after,
  assert,
  before,
  getAdminTokens,
  HTTP_STATUS_CODES,
  initServer,
  randomString,
  randomUUID,
  sendHttpRequest,
  suite,
  terminateServer,
  test,
  type ServerParams,
} from '../utils.js';

import { deleteRoles, seedRole, seedRoles, type Role } from './utils.js';

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

    await seedRoles(serverParams, 32, async (roles) => {
      const res = await sendHttpRequest({
        route: `${serverParams.routes.http}/roles`,
        method: 'GET',
        headers: { Authorization: accessToken },
      });
      assert.strictEqual(res.status, HTTP_STATUS_CODES.SUCCESS);

      const fetchedRoles = (await res.json()) as Role[];
      roles.forEach((role) => {
        const matchingRole = fetchedRoles.find((fetchedRole) => {
          return fetchedRole.id === role.id;
        });

        assert.deepStrictEqual(role, matchingRole);
      });
    });
  });
  await test('Valid - Read a lot', async () => {
    const { accessToken } = await getAdminTokens(serverParams);

    await seedRoles(serverParams, 8_192, async (roles) => {
      const res = await sendHttpRequest({
        route: `${serverParams.routes.http}/roles`,
        method: 'GET',
        headers: { Authorization: accessToken },
      });
      assert.strictEqual(res.status, HTTP_STATUS_CODES.SUCCESS);

      const fetchedRoles = (await res.json()) as Role[];
      roles.forEach((role) => {
        const matchingRole = fetchedRoles.find((fetchedRole) => {
          return fetchedRole.id === role.id;
        });

        assert.deepStrictEqual(role, matchingRole);
      });
    });
  });
  await test('Invalid - Create request with excess size', async () => {
    const { status } = await sendHttpRequest({
      route: `${serverParams.routes.http}/roles`,
      method: 'POST',
      payload: { name: 'a'.repeat(65_536) },
    });

    assert.strictEqual(status, HTTP_STATUS_CODES.CONTENT_TOO_LARGE);
  });
  await test('Valid - Create', async () => {
    let roleId = '';

    try {
      const { accessToken } = await getAdminTokens(serverParams);

      const roleData = { name: randomString(16) } as const;

      const res = await sendHttpRequest({
        route: `${serverParams.routes.http}/roles`,
        method: 'POST',
        headers: { Authorization: accessToken },
        payload: roleData,
      });
      assert.strictEqual(res.status, HTTP_STATUS_CODES.CREATED);

      const { id, ...fields } = (await res.json()) as Role;
      roleId = id;
      assert.strictEqual(typeof id === 'string', true);
      assert.deepStrictEqual(
        { ...roleData, name: roleData.name.toLowerCase() },
        fields,
      );
    } finally {
      await deleteRoles(serverParams, roleId);
    }
  });
  await test('Invalid - Update request with excess size', async () => {
    const { status } = await sendHttpRequest({
      route: `${serverParams.routes.http}/roles/${randomUUID()}`,
      method: 'PUT',
      payload: { name: 'a'.repeat(65_536) },
    });

    assert.strictEqual(status, HTTP_STATUS_CODES.CONTENT_TOO_LARGE);
  });
  await test('Valid - Update', async () => {
    const { accessToken } = await getAdminTokens(serverParams);

    await seedRole(serverParams, async (role) => {
      const updatedRoleData = { name: randomString(16) } as const;

      const res = await sendHttpRequest({
        route: `${serverParams.routes.http}/roles/${role.id}`,
        method: 'PUT',
        headers: { Authorization: accessToken },
        payload: updatedRoleData,
      });
      assert.strictEqual(res.status, HTTP_STATUS_CODES.SUCCESS);

      const updatedRole = await res.json();
      assert.deepStrictEqual(
        {
          ...role,
          ...{
            ...updatedRoleData,
            name: updatedRoleData.name.toLowerCase(),
          },
        },
        updatedRole,
      );
    });
  });
  await test('Valid - Delete existent role', async () => {
    let roleId = '';

    try {
      const { accessToken } = await getAdminTokens(serverParams);

      const roleData = { name: randomString() } as const;

      let res = await sendHttpRequest({
        route: `${serverParams.routes.http}/roles`,
        method: 'POST',
        headers: { Authorization: accessToken },
        payload: roleData,
      });
      assert.strictEqual(res.status, HTTP_STATUS_CODES.CREATED);

      const { id } = (await res.json()) as Role;
      roleId = id;

      res = await sendHttpRequest({
        route: `${serverParams.routes.http}/roles/${id}`,
        method: 'DELETE',
        headers: { Authorization: accessToken },
      });

      const responseBody = await res.text();

      assert.strictEqual(res.status, HTTP_STATUS_CODES.NO_CONTENT);
      assert.strictEqual(responseBody, '');
    } finally {
      await deleteRoles(serverParams, roleId);
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
