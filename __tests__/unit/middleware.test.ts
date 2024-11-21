import {
  ERROR_CODES,
  HTTP_STATUS_CODES,
  MRSError,
  Middlewares,
  PostgresError,
  after,
  assert,
  before,
  createHttpMocks,
  initServer,
  mockLogger,
  randomString,
  suite,
  terminateServer,
  test,
  type LoggerHandler,
  type ResponseWithCtx,
  type ResponseWithoutCtx,
  type ServerParams,
} from '../utils.js';

/**********************************************************************************/

await suite('Middleware tests', async () => {
  let logger: LoggerHandler = null!;
  let serverParams: ServerParams = null!;
  before(async () => {
    ({ logger } = mockLogger());
    serverParams = await initServer();
  });
  after(() => {
    terminateServer(serverParams);
  });

  await suite('Allowed methods', async () => {
    await test('Valid methods', (ctx) => {
      const methods = [
        'HEAD',
        'GET',
        'POST',
        'PUT',
        'PATCH',
        'DELETE',
        'OPTIONS',
      ] as const;

      const checkMethodMiddleware = Middlewares.checkMethod(new Set(methods));

      const nextMock = ctx.mock.fn();
      const checkMethodMiddlewareSpy = ctx.mock.fn(checkMethodMiddleware);

      methods.forEach((allowedMethod, index) => {
        const { request, response } = createHttpMocks<ResponseWithoutCtx>({
          logger: logger,
          reqOptions: {
            method: allowedMethod,
          },
        });

        checkMethodMiddlewareSpy(request, response, nextMock);

        assert.strictEqual(
          checkMethodMiddlewareSpy.mock.callCount(),
          index + 1,
        );
        assert.strictEqual(nextMock.mock.callCount(), index + 1);
        assert.strictEqual(nextMock.mock.calls[index]?.arguments.length, 0);
      });
    });
    await test('Invalid methods', (ctx) => {
      const methods = ['CONNECT', 'TRACE'] as const;
      const allowedMethods = [
        'HEAD',
        'GET',
        'POST',
        'PUT',
        'PATCH',
        'DELETE',
        'OPTIONS',
      ] as const;
      const expectedAllowHeader = { allow: allowedMethods.join(', ') };

      const checkMethodMiddleware = Middlewares.checkMethod(
        new Set(allowedMethods),
      );

      const nextMock = ctx.mock.fn();
      const checkMethodMiddlewareSpy = ctx.mock.fn(checkMethodMiddleware);

      methods.forEach((disallowedMethod, index) => {
        const { request, response } = createHttpMocks<ResponseWithoutCtx>({
          logger: logger,
          reqOptions: {
            method: disallowedMethod,
          },
        });

        checkMethodMiddlewareSpy(request, response, nextMock);

        assert.strictEqual(
          checkMethodMiddlewareSpy.mock.callCount(),
          index + 1,
        );
        assert.strictEqual(nextMock.mock.callCount(), 0);
        assert.strictEqual(response.statusCode, HTTP_STATUS_CODES.NOT_ALLOWED);
        assert.deepStrictEqual(response._getHeaders(), expectedAllowHeader);
      });
    });
  });

  await suite('Health check', async () => {
    await suite('Liveness', async () => {
      await test('Valid', async (ctx) => {
        const allowedMethods = ['GET', 'HEAD'] as const;

        const healthCheckMiddleware = Middlewares.healthCheck({
          type: 'liveness',
        });

        const healthCheckMiddlewareSpy = ctx.mock.fn(healthCheckMiddleware);

        let calls = allowedMethods.length;
        await Promise.all(
          allowedMethods.map(async (allowedMethod) => {
            const { request, response } = createHttpMocks<ResponseWithoutCtx>({
              logger: logger,
              reqOptions: {
                method: allowedMethod,
              },
            });

            await healthCheckMiddlewareSpy(request, response);
            --calls;

            assert.strictEqual(
              response.statusCode,
              HTTP_STATUS_CODES.NO_CONTENT,
            );
            assert.strictEqual(response._getData(), '');
          }),
        );
        assert.strictEqual(calls, 0);
      });
      await test('Invalid methods', async () => {
        const disallowedMethods = [
          'POST',
          'PATCH',
          'PUT',
          'DELETE',
          'OPTIONS',
        ] as const;

        let calls = disallowedMethods.length;
        await Promise.all(
          disallowedMethods.map(async (disallowedMethod) => {
            const res = await fetch(`${serverParams.routes.health}/liveness`, {
              method: disallowedMethod,
            });

            assert.strictEqual(res.status, HTTP_STATUS_CODES.NOT_FOUND);
            --calls;
          }),
        );
        assert.strictEqual(calls, 0);
      });
    });
    await suite('Readiness', async () => {
      await test('Valid', async (ctx) => {
        const allowedMethods = ['GET', 'HEAD'] as const;
        const isReadyCallback = ctx.mock.fn(async () => {
          return await Promise.resolve('');
        });

        const healthCheckMiddleware = Middlewares.healthCheck({
          type: 'readiness',
          isReadyCallback,
        });

        const healthCheckMiddlewareSpy = ctx.mock.fn(healthCheckMiddleware);

        let calls = allowedMethods.length;
        await Promise.all(
          allowedMethods.map(async (allowedMethod) => {
            const { request, response } = createHttpMocks<ResponseWithoutCtx>({
              logger: logger,
              reqOptions: {
                method: allowedMethod,
              },
            });

            await healthCheckMiddlewareSpy(request, response);
            --calls;

            assert.strictEqual(
              response.statusCode,
              HTTP_STATUS_CODES.NO_CONTENT,
            );
            assert.strictEqual(response._getData(), '');
          }),
        );
        assert.strictEqual(calls, 0);
      });
      await test('Invalid methods', async () => {
        const disallowedMethods = [
          'POST',
          'PATCH',
          'PUT',
          'DELETE',
          'OPTIONS',
        ] as const;

        let calls = disallowedMethods.length;
        await Promise.all(
          disallowedMethods.map(async (disallowedMethod) => {
            const res = await fetch(`${serverParams.routes.health}/readiness`, {
              method: disallowedMethod,
            });

            assert.strictEqual(res.status, HTTP_STATUS_CODES.NOT_FOUND);
            --calls;
          }),
        );
        assert.strictEqual(calls, 0);
      });
      await test('Application is not ready', async (ctx) => {
        const notReadyMsg = 'a'.repeat(8);
        const isReadyCallback = ctx.mock.fn(async () => {
          return await Promise.resolve(notReadyMsg);
        });
        const healthCheckMiddleware = Middlewares.healthCheck({
          type: 'readiness',
          isReadyCallback,
        });

        const healthCheckMiddlewareSpy = ctx.mock.fn(healthCheckMiddleware);

        const { request, response } = createHttpMocks<ResponseWithoutCtx>({
          logger: logger,
          reqOptions: {
            method: 'HEAD',
          },
        });

        await healthCheckMiddlewareSpy(request, response);

        assert.strictEqual(
          response.statusCode,
          HTTP_STATUS_CODES.GATEWAY_TIMEOUT,
        );
      });
    });
  });

  await suite('Handle missed routes', async () => {
    await test('Missed route', async () => {
      const res = await fetch(`${serverParams.routes.base}/${randomString()}`, {
        method: 'GET',
      });

      assert.strictEqual(res.status, HTTP_STATUS_CODES.NOT_FOUND);
    });
  });

  await suite('Error handler', async () => {
    await test('Headers sent', (ctx) => {
      const { request, response } = createHttpMocks<ResponseWithCtx>({
        logger: logger,
      });
      const nextMock = ctx.mock.fn();

      response.headersSent = true;
      const error = new Error('Expected error');

      const errorHandlerSpy = ctx.mock.fn(Middlewares.errorHandler);
      errorHandlerSpy(error, request, response, nextMock);

      assert.strictEqual(nextMock.mock.callCount(), 1);
      assert.deepStrictEqual(nextMock.mock.calls[0]?.arguments[0], error);
    });
    await test('MRS error instance', (ctx) => {
      const { request, response } = createHttpMocks<ResponseWithCtx>({
        logger: logger,
      });
      const nextMock = ctx.mock.fn();

      const error = new MRSError(999, 'Expected error');

      const errorHandlerSpy = ctx.mock.fn(Middlewares.errorHandler);
      errorHandlerSpy(error, request, response, nextMock);

      assert.strictEqual(response.statusCode, error.getClientError().code);
      assert.strictEqual(
        response._getJSONData(),
        error.getClientError().message,
      );
    });
    await test('Payload error', (ctx) => {
      const { request, response } = createHttpMocks<ResponseWithCtx>({
        logger: logger,
      });
      const nextMock = ctx.mock.fn();

      const error = new Error('Expected error');
      error.name = 'PayloadTooLargeError';

      const errorHandlerSpy = ctx.mock.fn(Middlewares.errorHandler);
      errorHandlerSpy(error, request, response, nextMock);

      assert.strictEqual(
        response.statusCode,
        HTTP_STATUS_CODES.CONTENT_TOO_LARGE,
      );
    });
    await suite('Postgres error', async () => {
      await test('Foreign key violation', (ctx) => {
        const { request, response } = createHttpMocks<ResponseWithCtx>({
          logger: logger,
        });

        const err = new PostgresError('Expected error');
        err.code = ERROR_CODES.POSTGRES.FOREIGN_KEY_VIOLATION;

        const errorHandlerSpy = ctx.mock.fn(Middlewares.errorHandler);
        errorHandlerSpy(err, request, response, ctx.mock.fn());

        assert.strictEqual(response.statusCode, HTTP_STATUS_CODES.SERVER_ERROR);
      });
      await test('Unique violation', (ctx) => {
        const { request, response } = createHttpMocks<ResponseWithCtx>({
          logger: logger,
        });

        const err = new PostgresError('Expected error');
        err.code = ERROR_CODES.POSTGRES.UNIQUE_VIOLATION;

        const errorHandlerSpy = ctx.mock.fn(Middlewares.errorHandler);
        errorHandlerSpy(err, request, response, ctx.mock.fn());

        assert.strictEqual(response.statusCode, HTTP_STATUS_CODES.SERVER_ERROR);
      });
      await test('Too many connections', (ctx) => {
        const { request, response } = createHttpMocks<ResponseWithCtx>({
          logger: logger,
        });

        const err = new PostgresError('Expected error');
        err.code = ERROR_CODES.POSTGRES.TOO_MANY_CONNECTIONS;

        const errorHandlerSpy = ctx.mock.fn(Middlewares.errorHandler);
        errorHandlerSpy(err, request, response, ctx.mock.fn());

        assert.strictEqual(response.statusCode, HTTP_STATUS_CODES.SERVER_ERROR);
      });
    });
    await test('Unexpected error object', (ctx) => {
      const { request, response } = createHttpMocks<ResponseWithCtx>({
        logger: logger,
      });

      const err = new Error('Expected error');

      const errorHandlerSpy = ctx.mock.fn(Middlewares.errorHandler);
      errorHandlerSpy(err, request, response, ctx.mock.fn());

      assert.strictEqual(response.statusCode, HTTP_STATUS_CODES.SERVER_ERROR);
    });
    await test('Unexpected non-error object', (ctx) => {
      const { request, response } = createHttpMocks<ResponseWithCtx>({
        logger: logger,
      });

      const errorHandlerSpy = ctx.mock.fn(Middlewares.errorHandler);
      errorHandlerSpy(5, request, response, ctx.mock.fn());

      assert.strictEqual(response.statusCode, HTTP_STATUS_CODES.SERVER_ERROR);
    });
  });
});
