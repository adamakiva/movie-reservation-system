import {
  after,
  assert,
  before,
  controllers,
  createHttpMocks,
  HTTP_STATUS_CODES,
  initServer,
  mockLogger,
  MRSError,
  PostgresError,
  suite,
  terminateServer,
  test,
  type LoggerHandler,
  type ResponseWithCtx,
  type ServerParams,
} from '../utils.js';

/**********************************************************************************/

await suite('Health check unit tests', async () => {
  let logger: LoggerHandler = null!;
  let serverParams: ServerParams = null!;
  before(async () => {
    ({ logger } = mockLogger());
    serverParams = await initServer();
  });
  after(() => {
    terminateServer(serverParams);
  });

  await suite('Validation layer', async () => {
    await test('Liveness - Invalid methods', (ctx) => {
      const disallowedMethods = [
        'POST',
        'PATCH',
        'PUT',
        'DELETE',
        'OPTIONS',
      ] as const;

      const nextMock = ctx.mock.fn();
      const livenessHealthCheckMock = ctx.mock.fn(
        controllers.healthcheckController.livenessHealthCheck,
      );
      const { request, response } = createHttpMocks<ResponseWithCtx>({
        logger: logger,
      });

      disallowedMethods.forEach((method, i) => {
        request.method = method;

        livenessHealthCheckMock(request, response, nextMock);
        assert.strictEqual(nextMock.mock.callCount(), i + 1);
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const calledError = nextMock.mock.calls[i]?.arguments[0];
        assert.strictEqual(calledError instanceof MRSError, true);
        assert.strictEqual(
          (calledError as MRSError).getClientError().code,
          HTTP_STATUS_CODES.NOT_ALLOWED,
        );
        assert.strictEqual(
          typeof response._getHeaders().allow === 'string',
          true,
        );
      });
    });
    await test('Readiness - Invalid methods', async (ctx) => {
      const disallowedMethods = [
        'POST',
        'PATCH',
        'PUT',
        'DELETE',
        'OPTIONS',
      ] as const;

      const nextMock = ctx.mock.fn();
      const readinessHealthCheckMock = ctx.mock.fn(
        controllers.healthcheckController.readinessHealthCheck,
      );
      const { request, response } = createHttpMocks<ResponseWithCtx>({
        logger: logger,
      });

      for (let i = 0; i < disallowedMethods.length; ++i) {
        request.method = disallowedMethods[i]!;

        // On purpose to track the call count and parameters
        // eslint-disable-next-line no-await-in-loop
        await readinessHealthCheckMock(request, response, nextMock);
        assert.strictEqual(nextMock.mock.callCount(), i + 1);
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const calledError = nextMock.mock.calls[i]?.arguments[0];
        assert.strictEqual(calledError instanceof MRSError, true);
        assert.strictEqual(
          (calledError as MRSError).getClientError().code,
          HTTP_STATUS_CODES.NOT_ALLOWED,
        );
        assert.strictEqual(
          typeof response._getHeaders().allow === 'string',
          true,
        );
      }
    });
  });
  await suite('Controller layer', async () => {
    await test('Readiness - Application is not ready', async (ctx) => {
      const nextMock = ctx.mock.fn();

      const { request, response } = createHttpMocks<ResponseWithCtx>({
        logger: logger,
        reqOptions: {
          method: 'HEAD',
        },
      });
      // @ts-expect-error Only this function is relevant for the test so we ignore
      // the need for additional fields
      response.locals.context.database = {
        isReady: async () => {
          await Promise.reject(new PostgresError('PH'));
        },
      };

      const validateHealthCheckMiddlewareSpy = ctx.mock.fn(
        controllers.healthcheckController.readinessHealthCheck,
      );

      await validateHealthCheckMiddlewareSpy(request, response, nextMock);

      assert.strictEqual(
        response._getStatusCode(),
        HTTP_STATUS_CODES.GATEWAY_TIMEOUT,
      );
      assert.strictEqual(nextMock.mock.callCount(), 0);
    });
  });
});
