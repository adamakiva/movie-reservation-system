import {
  after,
  assert,
  before,
  deleteUsers,
  getAdminRole,
  getAdminTokens,
  HTTP_STATUS_CODES,
  initServer,
  randomString,
  sendHttpRequest,
  suite,
  terminateServer,
  test,
  type ServerParams,
  type User,
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
    // TODO
  });
  await suite('Create', async () => {
    await test('Body too large', async () => {
      // TODO
    });
    await test('Valid', async () => {
      let userId = '';

      try {
        const [{ accessToken }, { roleId, roleName }] = await Promise.all([
          getAdminTokens(serverParams),
          getAdminRole(serverParams),
        ]);

        const userData = {
          firstName: randomString(),
          lastName: randomString(),
          email: `${randomString(8)}@ph.com`,
          password: '12345678',
          roleId,
        } as const;

        const res = await sendHttpRequest({
          route: `${serverParams.routes.base}/users`,
          method: 'POST',
          headers: { Authorization: accessToken },
          payload: userData,
        });
        assert.strictEqual(res.status, HTTP_STATUS_CODES.CREATED);

        const { id, ...createdUser } = (await res.json()) as User;
        const { roleId: _1, password: _2, ...expectedUser } = userData;
        userId = id;

        assert.deepStrictEqual(createdUser, {
          ...expectedUser,
          role: roleName,
        });
      } finally {
        await deleteUsers(serverParams, userId);
      }
    });
  });
  await suite('Update', async () => {
    await test('Body too large', async () => {
      // TODO
    });
    await test('Valid', async () => {
      // TODO
    });
  });
  await suite('Delete', async () => {
    await test('Existent', async () => {
      // TODO
    });
    await test('Non-existent', async () => {
      // TODO
    });
  });
});
