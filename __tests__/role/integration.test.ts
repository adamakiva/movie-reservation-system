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
    const roleIds: string[] = [];
    // Not concurrent on purpose, allows for easier error handling and speed is
    // irrelevant for the tests. Reason being if the creation is finished before
    // the failure of the tokens fetch we will need to clean them up. This way
    // we don't have to
    const { accessToken } = await getAdminTokens(serverParams);
    const roles = await seedRoles(serverParams, 32);
    roleIds.push(
      ...roles.map(({ id }) => {
        return id;
      }),
    );

    try {
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
    } finally {
      await deleteRoles(serverParams, ...roleIds);
    }
  });
  await test('Valid - Read a lot', async () => {
    const roleIds: string[] = [];

    const { accessToken } = await getAdminTokens(serverParams);
    const roles = await seedRoles(serverParams, 8_192);
    roleIds.push(
      ...roles.map(({ id }) => {
        return id;
      }),
    );

    try {
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
    } finally {
      await deleteRoles(serverParams, ...roleIds);
    }
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
    const roleIds: string[] = [];

    const { accessToken } = await getAdminTokens(serverParams);

    const roleData = { name: randomString(16) } as const;

    try {
      const res = await sendHttpRequest({
        route: `${serverParams.routes.http}/roles`,
        method: 'POST',
        headers: { Authorization: accessToken },
        payload: roleData,
      });
      assert.strictEqual(res.status, HTTP_STATUS_CODES.CREATED);

      const { id, ...fields } = (await res.json()) as Role;
      roleIds.push(id);
      assert.strictEqual(typeof id === 'string', true);
      assert.deepStrictEqual(
        { ...roleData, name: roleData.name.toLowerCase() },
        fields,
      );
    } finally {
      await deleteRoles(serverParams, ...roleIds);
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
    const roleIds: string[] = [];

    // Not concurrent on purpose, allows for easier error handling and speed is
    // irrelevant for the tests. Reason being if the creation is finished before
    // the failure of the tokens fetch we will need to clean them up. This way
    // we don't have to
    const { accessToken } = await getAdminTokens(serverParams);
    const role = await seedRole(serverParams);
    roleIds.push(role.id);

    const updatedRoleData = { name: randomString(16) } as const;

    try {
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
    } finally {
      await deleteRoles(serverParams, ...roleIds);
    }
  });
  await test('Valid - Delete existent role', async () => {
    const roleIds: string[] = [];

    const { accessToken } = await getAdminTokens(serverParams);

    const roleData = { name: randomString() } as const;

    try {
      let res = await sendHttpRequest({
        route: `${serverParams.routes.http}/roles`,
        method: 'POST',
        headers: { Authorization: accessToken },
        payload: roleData,
      });
      assert.strictEqual(res.status, HTTP_STATUS_CODES.CREATED);

      const { id } = (await res.json()) as Role;
      roleIds.push(id);

      res = await sendHttpRequest({
        route: `${serverParams.routes.http}/roles/${id}`,
        method: 'DELETE',
        headers: { Authorization: accessToken },
      });

      const responseBody = await res.text();

      assert.strictEqual(res.status, HTTP_STATUS_CODES.NO_CONTENT);
      assert.strictEqual(responseBody, '');
    } finally {
      await deleteRoles(serverParams, ...roleIds);
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
