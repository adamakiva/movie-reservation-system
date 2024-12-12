import { seedUser } from '../user/utils.js';
import {
  after,
  assert,
  before,
  generateTokens,
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
    await seedUser(serverParams, true, async ({ email }, _, password) => {
      const tokens = await generateTokens({
        serverParams,
        email,
        password,
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
    });
  });
  await test('Valid - Refresh', async () => {
    await seedUser(serverParams, true, async ({ email }, _, password) => {
      const { refreshToken } = await generateTokens({
        serverParams,
        email,
        password,
      });

      const res = await sendHttpRequest({
        route: `${serverParams.routes.http}/refresh`,
        method: 'PUT',
        payload: { refreshToken: refreshToken },
      });
      assert.strictEqual(res.status, HTTP_STATUS_CODES.SUCCESS);

      const refreshedAccessToken = await res.json();

      assert.strictEqual(typeof refreshedAccessToken === 'string', true);
      await assert.doesNotReject(async () => {
        await serverParams.authentication.validateToken(
          refreshedAccessToken as string,
          'access',
        );
      });
    });
  });
});
