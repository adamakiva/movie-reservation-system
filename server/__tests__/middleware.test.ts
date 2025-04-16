import {
  ERROR_CODES,
  GeneralError,
  HTTP_STATUS_CODES,
  Middlewares,
  PostgresError,
  after,
  assert,
  before,
  createHttpMocks,
  initServer,
  mockLogger,
  suite,
  terminateServer,
  test,
  type Logger,
  type ResponseWithContext,
  type ResponseWithoutContext,
  type ServerParams,
} from './utils.ts';

/**********************************************************************************/

await suite('Middleware tests', async () => {
  let logger: Logger = null!;
  let serverParams: ServerParams = null!;
  before(async () => {
    logger = mockLogger();
    serverParams = await initServer();
  });
  after(() => {
    terminateServer(serverParams);
  });

  await test('Valid - Methods middleware', (context) => {
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

    const nextMock = context.mock.fn();
    const checkMethodMiddlewareSpy = context.mock.fn(checkMethodMiddleware);

    methods.forEach((allowedMethod, index) => {
      const { request, response } = createHttpMocks<ResponseWithoutContext>({
        logger: logger,
        reqOptions: {
          method: allowedMethod,
        },
      });

      checkMethodMiddlewareSpy(request, response, nextMock);

      assert.strictEqual(checkMethodMiddlewareSpy.mock.callCount(), index + 1);
      assert.strictEqual(nextMock.mock.callCount(), index + 1);
      assert.strictEqual(nextMock.mock.calls[index]?.arguments.length, 0);
    });
  });
  await test('Invalid - Methods middleware', (context) => {
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

    const nextMock = context.mock.fn();
    const checkMethodMiddlewareSpy = context.mock.fn(checkMethodMiddleware);

    methods.forEach((disallowedMethod, index) => {
      const { request, response } = createHttpMocks<ResponseWithoutContext>({
        logger: logger,
        reqOptions: {
          method: disallowedMethod,
        },
      });

      checkMethodMiddlewareSpy(request, response, nextMock);

      assert.strictEqual(checkMethodMiddlewareSpy.mock.callCount(), index + 1);
      assert.strictEqual(nextMock.mock.callCount(), 0);
      assert.strictEqual(response.statusCode, HTTP_STATUS_CODES.NOT_ALLOWED);
      assert.deepStrictEqual(response._getHeaders(), expectedAllowHeader);
    });
  });
  await test('Valid - Non-existent route middleware', (context) => {
    const { request, response } = createHttpMocks<ResponseWithContext>({
      logger: logger,
    });

    const handleNonExistentRouteSpy = context.mock.fn(
      Middlewares.handleNonExistentRoute,
    );
    handleNonExistentRouteSpy(request, response);

    assert.strictEqual(response.statusCode, HTTP_STATUS_CODES.NOT_FOUND);
  });
  await test('Invalid - Authentication middleware: Missing authorization header', async (context) => {
    const { request, response } = createHttpMocks<ResponseWithContext>({
      logger: logger,
    });

    const httpAuthenticationMiddlewareSpy = context.mock
      .fn(serverParams.authentication.httpAuthenticationMiddleware)
      .bind(serverParams.authentication);

    await assert.rejects(
      async () => {
        await httpAuthenticationMiddlewareSpy()(
          request,
          response,
          context.mock.fn(),
        );
      },
      (error: GeneralError) => {
        assert.strictEqual(error instanceof GeneralError, true);
        assert.deepStrictEqual(error.getClientError(response), {
          code: HTTP_STATUS_CODES.UNAUTHORIZED,
          message: 'Missing authorization header',
        });

        return true;
      },
    );
  });
  await test('Invalid - Authentication middleware: Invalid token', async (context) => {
    const { request, response } = createHttpMocks<ResponseWithContext>({
      logger: logger,
      reqOptions: {
        headers: { authorization: 'Bearer bla' },
      },
    });

    const httpAuthenticationMiddlewareSpy = context.mock
      .fn(serverParams.authentication.httpAuthenticationMiddleware)
      .bind(serverParams.authentication);

    await assert.rejects(
      async () => {
        await httpAuthenticationMiddlewareSpy()(
          request,
          response,
          context.mock.fn(),
        );
      },
      (error: GeneralError) => {
        assert.strictEqual(error instanceof GeneralError, true);
        assert.deepStrictEqual(error.getClientError(response), {
          code: HTTP_STATUS_CODES.UNAUTHORIZED,
          message: 'Malformed JWT token',
        });

        return true;
      },
    );
  });
  await test('Invalid - Error handler middleware: Headers sent', (context) => {
    const { request, response } = createHttpMocks<ResponseWithContext>({
      logger: logger,
    });
    const nextMock = context.mock.fn();

    response.headersSent = true;
    const error = new Error('Expected error');

    const errorHandlerSpy = context.mock.fn(Middlewares.errorHandler);
    errorHandlerSpy(error, request, response, nextMock);

    assert.strictEqual(nextMock.mock.callCount(), 1);
    assert.deepStrictEqual(nextMock.mock.calls[0]?.arguments[0], error);
  });
  await test('Invalid - Error handler middleware: MRS error instance', (context) => {
    const { request, response } = createHttpMocks<ResponseWithContext>({
      logger: logger,
    });
    const nextMock = context.mock.fn();

    const error = new GeneralError(999, 'Expected error');

    const errorHandlerSpy = context.mock.fn(Middlewares.errorHandler);
    errorHandlerSpy(error, request, response, nextMock);

    assert.strictEqual(
      response.statusCode,
      error.getClientError(response).code,
    );
    assert.strictEqual(
      response._getJSONData(),
      error.getClientError(response).message,
    );
  });
  await test('Invalid - Error handler middleware: Payload error', (context) => {
    const { request, response } = createHttpMocks<ResponseWithContext>({
      logger: logger,
    });
    const nextMock = context.mock.fn();

    const error: Error & { type?: string } = new Error('Expected error');
    error.type = 'entity.too.large';

    const errorHandlerSpy = context.mock.fn(Middlewares.errorHandler);
    errorHandlerSpy(error, request, response, nextMock);

    assert.strictEqual(
      response.statusCode,
      HTTP_STATUS_CODES.CONTENT_TOO_LARGE,
    );
  });
  await test('Invalid - Error handler middleware: Foreign key violation', (context) => {
    context.mock.method(logger, 'fatal', () => {
      // Since this method log a fatal error, we mock it on purpose
    });

    const { request, response } = createHttpMocks<ResponseWithContext>({
      logger: logger,
    });

    const error = new PostgresError('Expected error');
    error.code = ERROR_CODES.POSTGRES.FOREIGN_KEY_VIOLATION;

    const errorHandlerSpy = context.mock.fn(Middlewares.errorHandler);
    errorHandlerSpy(error, request, response, context.mock.fn());

    assert.strictEqual(response.statusCode, HTTP_STATUS_CODES.SERVER_ERROR);
  });
  await test('Invalid - Error handler middleware: Unique violation', (context) => {
    context.mock.method(logger, 'fatal', () => {
      // Since this method log a fatal error, we mock it on purpose
    });

    const { request, response } = createHttpMocks<ResponseWithContext>({
      logger: logger,
    });

    const error = new PostgresError('Expected error');
    error.code = ERROR_CODES.POSTGRES.UNIQUE_VIOLATION;

    const errorHandlerSpy = context.mock.fn(Middlewares.errorHandler);
    errorHandlerSpy(error, request, response, context.mock.fn());

    assert.strictEqual(response.statusCode, HTTP_STATUS_CODES.SERVER_ERROR);
  });
  await test('Invalid - Error handler middleware: Too many connections', (context) => {
    context.mock.method(logger, 'fatal', () => {
      // Since this method log a fatal error, we mock it on purpose
    });

    const { request, response } = createHttpMocks<ResponseWithContext>({
      logger: logger,
    });

    const error = new PostgresError('Expected error');
    error.code = ERROR_CODES.POSTGRES.TOO_MANY_CONNECTIONS;

    const errorHandlerSpy = context.mock.fn(Middlewares.errorHandler);
    errorHandlerSpy(error, request, response, context.mock.fn());

    assert.strictEqual(response.statusCode, HTTP_STATUS_CODES.SERVER_ERROR);
  });
  await test('Invalid - Error handler middleware: Unexpected error object', (context) => {
    context.mock.method(logger, 'fatal', () => {
      // Since this method log a fatal error, we mock it on purpose
    });

    const { request, response } = createHttpMocks<ResponseWithContext>({
      logger: logger,
    });

    const error = new Error('Expected error');

    const errorHandlerSpy = context.mock.fn(Middlewares.errorHandler);
    errorHandlerSpy(error, request, response, context.mock.fn());

    assert.strictEqual(response.statusCode, HTTP_STATUS_CODES.SERVER_ERROR);
  });
  await test('Invalid - Error handler middleware: Unexpected non-error object', (context) => {
    context.mock.method(logger, 'fatal', () => {
      // Since this method log a fatal error, we mock it on purpose
    });

    const { request, response } = createHttpMocks<ResponseWithContext>({
      logger: logger,
    });

    const errorHandlerSpy = context.mock.fn(Middlewares.errorHandler);
    errorHandlerSpy(5, request, response, context.mock.fn());

    assert.strictEqual(response.statusCode, HTTP_STATUS_CODES.SERVER_ERROR);
  });
});
