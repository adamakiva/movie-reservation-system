import {
  after,
  assert,
  before,
  createRoles,
  getAdminTokens,
  HTTP_STATUS_CODES,
  initServer,
  randomString,
  randomUUID,
  sendHttpRequest,
  suite,
  terminateServer,
  test,
  type Role,
  type ServerParams,
} from '../utils.js';

/**********************************************************************************/

await suite('Role integration tests', async () => {
  let serverParams: ServerParams = null!;
  before(async () => {
    serverParams = await initServer();
  });
  after(() => {
    terminateServer(serverParams);
  });

  await test('Read', async () => {
    await createRoles(serverParams, 32, async ({ accessToken }, roles) => {
      const res = await sendHttpRequest({
        route: `${serverParams.routes.base}/roles`,
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
  await suite('Create', async () => {
    await test('Body too large', async () => {
      const { status } = await sendHttpRequest({
        route: `${serverParams.routes.base}/roles`,
        method: 'POST',
        payload: { name: 'a'.repeat(65_536) },
      });

      assert.strictEqual(status, HTTP_STATUS_CODES.CONTENT_TOO_LARGE);
    });
    await test('Valid', async () => {
      const { accessToken } = await getAdminTokens(serverParams);

      const roleData = { name: randomString(16) } as const;

      const res = await sendHttpRequest({
        route: `${serverParams.routes.base}/roles`,
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
    });
  });
  await suite('Update', async () => {
    await test('Body too large', async () => {
      const { status } = await sendHttpRequest({
        route: `${serverParams.routes.base}/roles/${randomUUID()}`,
        method: 'PUT',
        payload: { name: 'a'.repeat(65_536) },
      });

      assert.strictEqual(status, HTTP_STATUS_CODES.CONTENT_TOO_LARGE);
    });
    await test('Valid', async () => {
      await createRoles(serverParams, 1, async ({ accessToken }, role) => {
        const updatedRoleData = { name: randomString(16) } as const;

        const res = await sendHttpRequest({
          route: `${serverParams.routes.base}/roles/${role.id}`,
          method: 'PUT',
          headers: { Authorization: accessToken },
          payload: updatedRoleData,
        });
        assert.strictEqual(res.status, HTTP_STATUS_CODES.SUCCESS);

        const updatedRole = await res.json();
        assert.deepStrictEqual(
          {
            ...role,
            ...{ ...updatedRoleData, name: updatedRoleData.name.toLowerCase() },
          },
          updatedRole,
        );
      });
    });
  });
  await suite('Delete', async () => {
    await test('Existent', async () => {
      const { accessToken } = await getAdminTokens(serverParams);

      const roleData = { name: randomString() } as const;

      let res = await sendHttpRequest({
        route: `${serverParams.routes.base}/roles`,
        method: 'POST',
        headers: { Authorization: accessToken },
        payload: roleData,
      });
      assert.strictEqual(res.status, HTTP_STATUS_CODES.CREATED);

      const { id: roleId } = (await res.json()) as Role;

      res = await sendHttpRequest({
        route: `${serverParams.routes.base}/roles/${roleId}`,
        method: 'DELETE',
        headers: { Authorization: accessToken },
      });

      const responseBody = await res.text();

      assert.strictEqual(res.status, HTTP_STATUS_CODES.NO_CONTENT);
      assert.strictEqual(responseBody, '');
    });
    await test('Non-existent', async () => {
      const { accessToken } = await getAdminTokens(serverParams);

      const res = await sendHttpRequest({
        route: `${serverParams.routes.base}/roles/${randomUUID()}`,
        method: 'DELETE',
        headers: { Authorization: accessToken },
      });

      const responseBody = await res.text();

      assert.strictEqual(res.status, HTTP_STATUS_CODES.NO_CONTENT);
      assert.strictEqual(responseBody, '');
    });
  });
});
