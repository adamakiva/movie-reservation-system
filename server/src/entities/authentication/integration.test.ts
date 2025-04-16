/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import {
  after,
  assert,
  before,
  clearDatabase,
  generateTokens,
  generateUsersData,
  getAdminTokens,
  HTTP_STATUS_CODES,
  initServer,
  seedRole,
  sendHttpRequest,
  suite,
  terminateServer,
  test,
  type ServerParams,
} from '../../tests/utils.ts';

/**********************************************************************************/

await suite('Authentication integration tests', async () => {
  let server: ServerParams['server'] = null!;
  let authentication: ServerParams['authentication'] = null!;
  let database: ServerParams['database'] = null!;
  let httpRoute: ServerParams['routes']['http'] = null!;
  before(async () => {
    ({
      server,
      authentication,
      database,
      routes: { http: httpRoute },
    } = await initServer());
  });
  after(async () => {
    await terminateServer(server);
  });

  await test('Valid - Login', async () => {
    const { accessToken } = await getAdminTokens(httpRoute);

    const { id: roleId } = await seedRole(database);
    const userData = generateUsersData(1)[0]!;

    const { statusCode } = await sendHttpRequest<'POST', 'json'>({
      route: `${httpRoute}/users`,
      method: 'POST',
      headers: { Authorization: accessToken },
      payload: { ...userData, roleId },
      responseType: 'json',
    });
    assert.strictEqual(statusCode, HTTP_STATUS_CODES.CREATED);

    try {
      const tokens = await generateTokens({
        httpRoute: httpRoute,
        email: userData.email,
        password: userData.password,
      });
      assert.strictEqual(typeof tokens === 'object' && tokens !== null, true);
      assert.strictEqual(Object.keys(tokens).length, 2);

      assert.strictEqual(typeof tokens.accessToken === 'string', true);
      await assert.doesNotReject(async () => {
        await authentication.validateToken(
          tokens.accessToken as string,
          'access',
        );
      });
      assert.strictEqual(typeof tokens.refreshToken === 'string', true);
      await assert.doesNotReject(async () => {
        await authentication.validateToken(
          tokens.refreshToken as string,
          'refresh',
        );
      });
    } finally {
      await clearDatabase(database);
    }
  });
  await test('Valid - Refresh', async () => {
    const { accessToken } = await getAdminTokens(httpRoute);

    const { id: roleId } = await seedRole(database);
    const userData = generateUsersData(1)[0]!;

    const { statusCode } = await sendHttpRequest<'POST', 'json'>({
      route: `${httpRoute}/users`,
      method: 'POST',
      headers: { Authorization: accessToken },
      payload: { ...userData, roleId },
      responseType: 'json',
    });
    assert.strictEqual(statusCode, HTTP_STATUS_CODES.CREATED);

    try {
      const { refreshToken } = await generateTokens({
        httpRoute: httpRoute,
        email: userData.email,
        password: userData.password,
      });

      const result = await sendHttpRequest<'PUT', 'json', string>({
        route: `${httpRoute}/refresh`,
        method: 'PUT',
        payload: { refreshToken: refreshToken },
        responseType: 'json',
      });
      assert.strictEqual(result.statusCode, HTTP_STATUS_CODES.SUCCESS);

      assert.strictEqual(typeof result.responseBody === 'string', true);
      await assert.doesNotReject(async () => {
        await authentication.validateToken(result.responseBody, 'access');
      });
    } finally {
      await clearDatabase(database);
    }
  });
});
