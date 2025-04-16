/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import { seedRole } from '../role/utils.ts';
import { generateUsersData } from '../user/utils.ts';
import {
  after,
  assert,
  before,
  clearDatabase,
  generateTokens,
  getAdminTokens,
  HTTP_STATUS_CODES,
  initServer,
  sendHttpRequest,
  suite,
  terminateServer,
  test,
  type ServerParams,
} from '../utils.ts';

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
    const { accessToken } = await getAdminTokens(serverParams);

    const { id: roleId } = await seedRole(serverParams);
    const userData = generateUsersData(1)[0]!;

    const { statusCode } = await sendHttpRequest<'POST', 'json'>({
      route: `${serverParams.routes.http}/users`,
      method: 'POST',
      headers: { Authorization: accessToken },
      payload: { ...userData, roleId },
      responseType: 'json',
    });
    assert.strictEqual(statusCode, HTTP_STATUS_CODES.CREATED);

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
      await clearDatabase(serverParams.database);
    }
  });
  await test('Valid - Refresh', async () => {
    const { accessToken } = await getAdminTokens(serverParams);

    const { id: roleId } = await seedRole(serverParams);
    const userData = generateUsersData(1)[0]!;

    const { statusCode } = await sendHttpRequest<'POST', 'json'>({
      route: `${serverParams.routes.http}/users`,
      method: 'POST',
      headers: { Authorization: accessToken },
      payload: { ...userData, roleId },
      responseType: 'json',
    });
    assert.strictEqual(statusCode, HTTP_STATUS_CODES.CREATED);

    try {
      const { refreshToken } = await generateTokens({
        serverParams,
        email: userData.email,
        password: userData.password,
      });

      const result = await sendHttpRequest<'PUT', 'json', string>({
        route: `${serverParams.routes.http}/refresh`,
        method: 'PUT',
        payload: { refreshToken: refreshToken },
        responseType: 'json',
      });
      assert.strictEqual(result.statusCode, HTTP_STATUS_CODES.SUCCESS);

      assert.strictEqual(typeof result.responseBody === 'string', true);
      await assert.doesNotReject(async () => {
        await serverParams.authentication.validateToken(
          result.responseBody,
          'access',
        );
      });
    } finally {
      await clearDatabase(serverParams.database);
    }
  });
});
