import { deleteRoles, seedRole } from '../role/utils.js';
import { deleteUsers, generateUsersData, type User } from '../user/utils.js';
import {
  after,
  assert,
  before,
  generateTokens,
  getAdminTokens,
  HTTP_STATUS_CODES,
  initServer,
  sendHttpRequest,
  suite,
  terminateServer,
  test,
  type ServerParams,
} from '../utils.js';

/**********************************************************************************/

await suite('Authentication integration tests', async () => {
  let serverParams: ServerParams = null!;
  before(async () => {
    serverParams = await initServer();
  });
  after(() => {
    terminateServer(serverParams);
  });

  await test('Valid - Login', async () => {
    let userId = '';

    const { accessToken } = await getAdminTokens(serverParams);

    const { roleIds } = await seedRole(serverParams);
    const userData = generateUsersData(1)[0]!;

    const res = await sendHttpRequest({
      route: `${serverParams.routes.http}/users`,
      method: 'POST',
      headers: { Authorization: accessToken },
      payload: { ...userData, roleId: roleIds[0] },
    });
    assert.strictEqual(res.status, HTTP_STATUS_CODES.CREATED);

    ({ id: userId } = (await res.json()) as User);

    try {
      const tokens = await generateTokens({
        serverParams,
        email: userData.email,
        password: userData.password,
      });
      assert.strictEqual(typeof tokens === 'object' && tokens !== null, true);
      assert.strictEqual(Object.keys(tokens).length, 2);

      assert.strictEqual(typeof tokens.accessToken === 'string', true);
      await assert.doesNotReject(async () => {
        await serverParams.authentication.validateToken(
          tokens.accessToken as string,
          'access',
        );
      });
      assert.strictEqual(typeof tokens.refreshToken === 'string', true);
      await assert.doesNotReject(async () => {
        await serverParams.authentication.validateToken(
          tokens.refreshToken as string,
          'refresh',
        );
      });
    } finally {
      await deleteUsers(serverParams, userId);
      await deleteRoles(serverParams, ...roleIds);
    }
  });
  await test('Valid - Refresh', async () => {
    let userId = '';

    const { accessToken } = await getAdminTokens(serverParams);

    const { roleIds } = await seedRole(serverParams);
    const userData = generateUsersData(1)[0]!;

    const res = await sendHttpRequest({
      route: `${serverParams.routes.http}/users`,
      method: 'POST',
      headers: { Authorization: accessToken },
      payload: { ...userData, roleId: roleIds[0] },
    });
    assert.strictEqual(res.status, HTTP_STATUS_CODES.CREATED);

    ({ id: userId } = (await res.json()) as User);

    try {
      const { refreshToken } = await generateTokens({
        serverParams,
        email: userData.email,
        password: userData.password,
      });

      const res = await sendHttpRequest({
        route: `${serverParams.routes.http}/refresh`,
        method: 'PUT',
        payload: { refreshToken: refreshToken },
      });
      assert.strictEqual(res.status, HTTP_STATUS_CODES.SUCCESS);

      const refreshedAccessToken = await res.text();

      assert.strictEqual(typeof refreshedAccessToken === 'string', true);
      await assert.doesNotReject(async () => {
        await serverParams.authentication.validateToken(
          refreshedAccessToken,
          'access',
        );
      });
    } finally {
      await deleteUsers(serverParams, userId);
      await deleteRoles(serverParams, ...roleIds);
    }
  });
});
