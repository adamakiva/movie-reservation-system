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
} from '../utils.js';

/**********************************************************************************/

await suite('Healh check integration tests', async () => {
  let serverParams: ServerParams = null!;
  before(async () => {
    serverParams = await initServer();
  });
  after(() => {
    terminateServer(serverParams);
  });

  await test('Liveness - Valid', async () => {
    const allowedMethods = ['HEAD', 'GET'] as const;

    await Promise.all(
      allowedMethods.map(async (method) => {
        const { status } = await fetch(`${serverParams.routes.health}/alive`, {
          method,
        });
        assert.strictEqual(status, HTTP_STATUS_CODES.NO_CONTENT);
      }),
    );
  });
  await test('Readiness - Valid', async () => {
    const allowedMethods = ['HEAD', 'GET'] as const;

    await Promise.all(
      allowedMethods.map(async (method) => {
        const { status } = await fetch(`${serverParams.routes.health}/ready`, {
          method,
        });
        assert.strictEqual(status, HTTP_STATUS_CODES.NO_CONTENT);
      }),
    );
  });
});
