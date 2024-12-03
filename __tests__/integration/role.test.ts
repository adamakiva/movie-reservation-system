import {
  after,
  assert,
  before,
  createRoles,
  getAdminTokens,
  HTTP_STATUS_CODES,
  initServer,
  randomString,
  sendHttpRequest,
  suite,
  terminateServer,
  test,
  type Role,
  type ServerParams,
} from '../utils.js';

/**********************************************************************************/

await suite.only('Role integration tests', async () => {
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
  await test('Create', async () => {
    const { accessToken } = await getAdminTokens(serverParams);

    const roleData = { name: randomString() } as const;

    const res = await sendHttpRequest({
      route: `${serverParams.routes.base}/roles`,
      method: 'POST',
      headers: { Authorization: accessToken },
      payload: roleData,
    });
    assert.strictEqual(res.status, HTTP_STATUS_CODES.CREATED);

    const { id, ...fields } = (await res.json()) as Role;
    assert.strictEqual(typeof id === 'string', true);
    assert.deepStrictEqual(roleData, fields);
  });
  await test('Update', async () => {
    await createRoles(serverParams, 1, async ({ accessToken }, role) => {
      const updatedRoleData = { name: randomString(16) };

      const res = await sendHttpRequest({
        route: `${serverParams.routes.base}/roles/${role.id}`,
        method: 'PUT',
        headers: { Authorization: accessToken },
        payload: updatedRoleData,
      });
      assert.strictEqual(res.status, HTTP_STATUS_CODES.SUCCESS);

      const updatedRole = await res.json();
      assert.deepStrictEqual({ ...role, ...updatedRoleData }, updatedRole);
    });
  });
  await test('Delete', async () => {
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
});
