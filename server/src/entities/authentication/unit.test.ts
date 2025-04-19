import {
  after,
  assert,
  AUTHENTICATION,
  before,
  createHttpMocks,
  GeneralError,
  HTTP_STATUS_CODES,
  initServer,
  randomAlphaNumericString,
  randomUUID,
  suite,
  terminateServer,
  test,
  USER,
  type ResponseWithContext,
  type ServerParams,
} from '../../tests/utils.ts';

import * as serviceFunctions from './controller.ts';
import * as validationFunctions from './validator.ts';

/**********************************************************************************/

await suite('Authentication unit tests', async () => {
  let logger: ServerParams['logger'] = null!;
  let server: ServerParams['server'] = null!;
  let authentication: ServerParams['authentication'] = null!;
  let fileManager: ServerParams['fileManager'] = null!;
  let database: ServerParams['database'] = null!;
  let messageQueue: ServerParams['messageQueue'] = null!;
  before(async () => {
    ({ server, fileManager, authentication, database, messageQueue, logger } =
      await initServer());
  });
  after(async () => {
    await terminateServer(server, database);
  });

  await test('Invalid - Login validation: Missing email', (context) => {
    const { request, response } = createHttpMocks<ResponseWithContext>({
      logger,
      reqOptions: {
        body: {
          password: 'bla123',
        },
      },
    });

    const validateLoginSpy = context.mock.fn(validationFunctions.validateLogin);

    assert.throws(
      () => {
        validateLoginSpy(request);
      },
      (error: GeneralError) => {
        assert.strictEqual(error instanceof GeneralError, true);
        assert.deepStrictEqual(error.getClientError(response), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: USER.EMAIL.REQUIRED_ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Login validation: Invalid email', (context) => {
    const { request, response } = createHttpMocks<ResponseWithContext>({
      logger,
      reqOptions: {
        body: {
          email: 'a@b@c.com',
          password: 'bla123',
        },
      },
    });

    const validateLoginSpy = context.mock.fn(validationFunctions.validateLogin);

    assert.throws(
      () => {
        validateLoginSpy(request);
      },
      (error: GeneralError) => {
        assert.strictEqual(error instanceof GeneralError, true);
        assert.deepStrictEqual(error.getClientError(response), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: USER.EMAIL.ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Login validation: Email too long', (context) => {
    const { request, response } = createHttpMocks<ResponseWithContext>({
      logger,
      reqOptions: {
        body: {
          email: `${randomAlphaNumericString(USER.EMAIL.MAX_LENGTH.VALUE + 1)}@ph.com`,
          password: 'bla123',
        },
      },
    });

    const validateLoginSpy = context.mock.fn(validationFunctions.validateLogin);

    assert.throws(
      () => {
        validateLoginSpy(request);
      },
      (error: GeneralError) => {
        assert.strictEqual(error instanceof GeneralError, true);
        assert.deepStrictEqual(error.getClientError(response), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: USER.EMAIL.MAX_LENGTH.ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Login validation: Missing password', (context) => {
    const { request, response } = createHttpMocks<ResponseWithContext>({
      logger,
      reqOptions: {
        body: {
          email: 'ph@ph.com',
        },
      },
    });

    const validateLoginSpy = context.mock.fn(validationFunctions.validateLogin);

    assert.throws(
      () => {
        validateLoginSpy(request);
      },
      (error: GeneralError) => {
        assert.strictEqual(error instanceof GeneralError, true);
        assert.deepStrictEqual(error.getClientError(response), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: USER.PASSWORD.REQUIRED_ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Login validation: Password too short', (context) => {
    const { request, response } = createHttpMocks<ResponseWithContext>({
      logger,
      reqOptions: {
        body: {
          email: 'ph@ph.com',
          password: randomAlphaNumericString(
            USER.PASSWORD.MIN_LENGTH.VALUE - 1,
          ),
        },
      },
    });

    const validateLoginSpy = context.mock.fn(validationFunctions.validateLogin);

    assert.throws(
      () => {
        validateLoginSpy(request);
      },
      (error: GeneralError) => {
        assert.strictEqual(error instanceof GeneralError, true);
        assert.deepStrictEqual(error.getClientError(response), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: USER.PASSWORD.MIN_LENGTH.ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Login validation: Password too long', (context) => {
    const { request, response } = createHttpMocks<ResponseWithContext>({
      logger,
      reqOptions: {
        body: {
          email: 'ph@ph.com',
          password: randomAlphaNumericString(
            USER.PASSWORD.MAX_LENGTH.VALUE + 1,
          ),
        },
      },
    });

    const validateLoginSpy = context.mock.fn(validationFunctions.validateLogin);

    assert.throws(
      () => {
        validateLoginSpy(request);
      },
      (error: GeneralError) => {
        assert.strictEqual(error instanceof GeneralError, true);
        assert.deepStrictEqual(error.getClientError(response), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: USER.PASSWORD.MAX_LENGTH.ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Login service: Non-existent user', async (context) => {
    const { request, response } = createHttpMocks<ResponseWithContext>({
      logger,
      reqOptions: {
        body: {
          email: `${randomUUID()}@ph.com`,
          password: randomAlphaNumericString(),
        },
      },
      resOptions: {
        locals: {
          context: {
            authentication,
            fileManager,
            database,
            messageQueue,
            logger,
          },
        },
      },
    });

    const loginSpy = context.mock.fn(serviceFunctions.login);

    await assert.rejects(
      async () => {
        await loginSpy(request, response);
      },
      (error: GeneralError) => {
        assert.strictEqual(error instanceof GeneralError, true);
        assert.strictEqual(
          error.getClientError(response).code,
          HTTP_STATUS_CODES.BAD_REQUEST,
        );
        return true;
      },
    );
  });
  await test('Invalid - Login service: Incorrect password', async (context) => {
    const { request, response } = createHttpMocks<ResponseWithContext>({
      logger,
      reqOptions: {
        body: {
          email: `${randomUUID()}@ph.com`,
          password: randomAlphaNumericString(),
        },
      },
      resOptions: {
        locals: {
          context: {
            authentication,
            fileManager,
            database,
            messageQueue,
            logger,
          },
        },
      },
    });

    context.mock.method(database, 'getHandler', () => {
      return {
        select: () => {
          return {
            from: () => {
              return {
                where: () => {
                  return {
                    limit: () => {
                      return [
                        { id: randomUUID(), hash: randomAlphaNumericString() },
                      ];
                    },
                  };
                },
              };
            },
          };
        },
      } as const;
    });
    const loginSpy = context.mock.fn(serviceFunctions.login);

    await assert.rejects(
      async () => {
        await loginSpy(request, response);
      },
      (error: GeneralError) => {
        assert.strictEqual(error instanceof GeneralError, true);
        assert.strictEqual(
          error.getClientError(response).code,
          HTTP_STATUS_CODES.BAD_REQUEST,
        );
        return true;
      },
    );
  });
  await test('Invalid - Refresh validation: Missing refresh token', (context) => {
    const { request, response } = createHttpMocks<ResponseWithContext>({
      logger,
    });

    const validateRefreshAccessTokenSpy = context.mock.fn(
      validationFunctions.validateRefreshAccessToken,
    );

    assert.throws(
      () => {
        validateRefreshAccessTokenSpy(request);
      },
      (error: GeneralError) => {
        assert.strictEqual(error instanceof GeneralError, true);
        assert.deepStrictEqual(error.getClientError(response), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: AUTHENTICATION.REFRESH.TOKEN.REQUIRED_ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Refresh validation: Invalid refresh token', (context) => {
    const { request, response } = createHttpMocks<ResponseWithContext>({
      logger,
      reqOptions: {
        body: {
          refreshToken: randomAlphaNumericString(64),
        },
      },
    });

    const validateRefreshAccessTokenSpy = context.mock.fn(
      validationFunctions.validateRefreshAccessToken,
    );

    assert.throws(
      () => {
        validateRefreshAccessTokenSpy(request);
      },
      (error: GeneralError) => {
        assert.strictEqual(error instanceof GeneralError, true);
        assert.deepStrictEqual(error.getClientError(response), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: AUTHENTICATION.REFRESH.TOKEN.ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test(
    'Invalid - Refresh service: Malformed JWT',
    { todo: 'Figure out a way to mock the sync validation check' },
    async (context) => {
      const { request, response } = createHttpMocks<ResponseWithContext>({
        logger,
        reqOptions: {
          body: {
            refreshToken: 'Bearer ph',
          },
        },
        resOptions: {
          locals: {
            context: {
              authentication,
              fileManager,
              database,
              messageQueue,
              logger,
            },
          },
        },
      });

      const refreshAccessTokenSpy = context.mock.fn(
        serviceFunctions.refreshAccessToken,
      );

      await assert.rejects(
        async () => {
          await refreshAccessTokenSpy(request, response);
        },
        (error: GeneralError) => {
          assert.strictEqual(error instanceof GeneralError, true);
          assert.strictEqual(
            error.getClientError(response).code,
            HTTP_STATUS_CODES.UNAUTHORIZED,
          );
          return true;
        },
      );
    },
  );
  await test('Invalid - Refresh service: Missing JWT subject', async (context) => {
    const { request, response } = createHttpMocks<ResponseWithContext>({
      logger,
      reqOptions: {
        body: {
          refreshToken: await authentication.generateRefreshToken(
            randomUUID(),
            Date.now() + 10_000,
          ),
        },
      },
      resOptions: {
        locals: {
          context: {
            authentication,
            fileManager,
            database,
            messageQueue,
            logger,
          },
        },
      },
    });

    context.mock.method(authentication, 'validateToken', async () => {
      return await Promise.resolve({
        payload: { sub: undefined },
      });
    });
    const refreshAccessTokenSpy = context.mock.fn(
      serviceFunctions.refreshAccessToken,
    );

    await assert.rejects(
      async () => {
        await refreshAccessTokenSpy(request, response);
      },
      (error: GeneralError) => {
        assert.strictEqual(error instanceof GeneralError, true);
        assert.strictEqual(
          error.getClientError(response).code,
          HTTP_STATUS_CODES.UNAUTHORIZED,
        );
        return true;
      },
    );
  });
});
