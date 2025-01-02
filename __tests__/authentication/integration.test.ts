import { seedRole } from '../role/utils.js';
import {
  deleteRoles,
  deleteUsers,
  generateUsersData,
  type User,
} from '../user/utils.js';
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
    const userIds: string[] = [];
    const roleIds: string[] = [];

    const { accessToken } = await getAdminTokens(serverParams);

    const { id: roleId } = await seedRole(serverParams);
    roleIds.push(roleId);
    const userData = generateUsersData(1)[0]!;

    const res = await sendHttpRequest({
      route: `${serverParams.routes.http}/users`,
      method: 'POST',
      headers: { Authorization: accessToken },
      payload: { ...userData, roleId },
    });
    assert.strictEqual(res.status, HTTP_STATUS_CODES.CREATED);

    const createdUser = (await res.json()) as User;
    userIds.push(createdUser.id);

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
      await deleteUsers(serverParams, ...userIds);
      await deleteRoles(serverParams, ...roleIds);
    }
  });
  await test('Valid - Refresh', async () => {
    const userIds: string[] = [];
    const roleIds: string[] = [];

    const { accessToken } = await getAdminTokens(serverParams);

    const { id: roleId } = await seedRole(serverParams);
    roleIds.push(roleId);
    const userData = generateUsersData(1)[0]!;

    const res = await sendHttpRequest({
      route: `${serverParams.routes.http}/users`,
      method: 'POST',
      headers: { Authorization: accessToken },
      payload: { ...userData, roleId },
    });
    assert.strictEqual(res.status, HTTP_STATUS_CODES.CREATED);

    const createdUser = (await res.json()) as User;
    userIds.push(createdUser.id);

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
      await deleteUsers(serverParams, ...userIds);
      await deleteRoles(serverParams, ...roleIds);
    }
  });
});
