import {
  after,
  assert,
  before,
  HTTP_STATUS_CODES,
  initServer,
  seedUser,
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

  await test('Login - Valid', async () => {
    await seedUser(serverParams, async (email, password) => {
      const tokens = await generateTokens({
        route: `${serverParams.routes.base}/login`,
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
  await test('Refresh - Valid', async () => {
    await seedUser(serverParams, async (email, password) => {
      const { refreshToken } = await generateTokens({
        route: `${serverParams.routes.base}/login`,
        email,
        password,
      });

      const res = await sendHttpRequest({
        route: `${serverParams.routes.base}/refresh`,
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

/**********************************************************************************/

async function generateTokens(params: {
  route: string;
  email: string;
  password: string;
}) {
  const { route, email, password } = params;

  const res = await sendHttpRequest({
    route,
    method: 'POST',
    payload: { email, password },
  });

  assert.strictEqual(res.status, HTTP_STATUS_CODES.CREATED);

  return await res.json();
}
