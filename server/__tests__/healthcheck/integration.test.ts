import {
  after,
  assert,
  before,
  HTTP_STATUS_CODES,
  initServer,
  suite,
  terminateServer,
  test,
  type ServerParams,
} from '../utils.ts';

/**********************************************************************************/

await suite('Healthcheck integration tests', async () => {
  let serverParams: ServerParams = null!;
  before(async () => {
    serverParams = await initServer();
  });
  after(() => {
    terminateServer(serverParams);
  });

  await test('Valid - Liveness', async () => {
    const allowedMethods = ['HEAD', 'GET'] as const;

    await Promise.all(
      allowedMethods.map(async (method) => {
        const { status } = await fetch(`${serverParams.routes.base}/alive`, {
          method,
        });
        assert.strictEqual(status, HTTP_STATUS_CODES.NO_CONTENT);
      }),
    );
  });
  await test('Valid - Readiness', async () => {
    const allowedMethods = ['HEAD', 'GET'] as const;

    await Promise.all(
      allowedMethods.map(async (method) => {
        const { status } = await fetch(`${serverParams.routes.base}/ready`, {
          method,
        });
        assert.strictEqual(status, HTTP_STATUS_CODES.NO_CONTENT);
      }),
    );
  });
});
