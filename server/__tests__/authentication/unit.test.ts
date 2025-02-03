import * as serviceFunctions from '../../src/entities/authentication/service/index.ts';
import * as validationFunctions from '../../src/entities/authentication/validator.ts';

import {
  after,
  assert,
  before,
  createHttpMocks,
  GeneralError,
  HTTP_STATUS_CODES,
  initServer,
  mockLogger,
  randomString,
  randomUUID,
  suite,
  terminateServer,
  test,
  VALIDATION,
  type LoggerHandler,
  type ResponseWithContext,
  type ServerParams,
} from '../utils.ts';

/**********************************************************************************/

const { AUTHENTICATION, USER } = VALIDATION;

/**********************************************************************************/

await suite('Authentication unit tests', async () => {
  let logger: LoggerHandler = null!;
  let serverParams: ServerParams = null!;
  before(async () => {
    ({ logger } = mockLogger());
    serverParams = await initServer();
  });
  after(() => {
    terminateServer(serverParams);
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
      (err: GeneralError) => {
        assert.strictEqual(err instanceof GeneralError, true);
        assert.deepStrictEqual(err.getClientError(response), {
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
      (err: GeneralError) => {
        assert.strictEqual(err instanceof GeneralError, true);
        assert.deepStrictEqual(err.getClientError(response), {
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
          email: `${randomString(USER.EMAIL.MAX_LENGTH.VALUE + 1)}@ph.com`,
          password: 'bla123',
        },
      },
    });

    const validateLoginSpy = context.mock.fn(validationFunctions.validateLogin);

    assert.throws(
      () => {
        validateLoginSpy(request);
      },
      (err: GeneralError) => {
        assert.strictEqual(err instanceof GeneralError, true);
        assert.deepStrictEqual(err.getClientError(response), {
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
      (err: GeneralError) => {
        assert.strictEqual(err instanceof GeneralError, true);
        assert.deepStrictEqual(err.getClientError(response), {
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
          password: randomString(USER.PASSWORD.MIN_LENGTH.VALUE - 1),
        },
      },
    });

    const validateLoginSpy = context.mock.fn(validationFunctions.validateLogin);

    assert.throws(
      () => {
        validateLoginSpy(request);
      },
      (err: GeneralError) => {
        assert.strictEqual(err instanceof GeneralError, true);
        assert.deepStrictEqual(err.getClientError(response), {
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
          password: randomString(USER.PASSWORD.MAX_LENGTH.VALUE + 1),
        },
      },
    });

    const validateLoginSpy = context.mock.fn(validationFunctions.validateLogin);

    assert.throws(
      () => {
        validateLoginSpy(request);
      },
      (err: GeneralError) => {
        assert.strictEqual(err instanceof GeneralError, true);
        assert.deepStrictEqual(err.getClientError(response), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: USER.PASSWORD.MAX_LENGTH.ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Login service: Non-existent user', async (context) => {
    const { authentication, fileManager, database } = serverParams;
    const { response } = createHttpMocks<ResponseWithContext>({ logger });

    const loginSpy = context.mock.fn(serviceFunctions.login);

    await assert.rejects(
      async () => {
        await loginSpy(
          {
            authentication,
            fileManager,
            database,
            logger,
          },
          {
            email: `${randomUUID()}@ph.com`,
            password: randomString(),
          },
        );
      },
      (err: GeneralError) => {
        assert.strictEqual(err instanceof GeneralError, true);
        assert.strictEqual(
          err.getClientError(response).code,
          HTTP_STATUS_CODES.BAD_REQUEST,
        );
        return true;
      },
    );
  });
  await test('Invalid - Login service: Incorrect password', async (context) => {
    const { authentication, fileManager, database } = serverParams;
    const { response } = createHttpMocks<ResponseWithContext>({ logger });

    context.mock.method(database, 'getHandler', () => {
      return {
        select: () => {
          return {
            from: () => {
              return {
                where: () => {
                  return {
                    limit: () => {
                      return [{ id: randomUUID(), hash: randomString() }];
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
        await loginSpy(
          {
            authentication,
            fileManager,
            database,
            logger,
          },
          {
            email: `${randomUUID()}@ph.com`,
            password: randomString(),
          },
        );
      },
      (err: GeneralError) => {
        assert.strictEqual(err instanceof GeneralError, true);
        assert.strictEqual(
          err.getClientError(response).code,
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
      (err: GeneralError) => {
        assert.strictEqual(err instanceof GeneralError, true);
        assert.deepStrictEqual(err.getClientError(response), {
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
          refreshToken: randomString(64),
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
      (err: GeneralError) => {
        assert.strictEqual(err instanceof GeneralError, true);
        assert.deepStrictEqual(err.getClientError(response), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: AUTHENTICATION.REFRESH.TOKEN.ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Refresh service: Malformed JWT', async (context) => {
    const { authentication, fileManager, database } = serverParams;
    const { response } = createHttpMocks<ResponseWithContext>({ logger });

    const refreshAccessTokenSpy = context.mock.fn(
      serviceFunctions.refreshAccessToken,
    );

    await assert.rejects(
      async () => {
        await refreshAccessTokenSpy(
          {
            authentication,
            fileManager,
            database,
            logger,
          },
          'Bearer ph',
        );
      },
      (err: GeneralError) => {
        assert.strictEqual(err instanceof GeneralError, true);
        assert.strictEqual(
          err.getClientError(response).code,
          HTTP_STATUS_CODES.UNAUTHORIZED,
        );
        return true;
      },
    );
  });
  await test('Invalid - Refresh service: Missing JWT subject', async (context) => {
    const { authentication, fileManager, database } = serverParams;
    const { response } = createHttpMocks<ResponseWithContext>({ logger });

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
        await refreshAccessTokenSpy(
          {
            authentication,
            fileManager,
            database,
            logger,
          },
          await authentication.generateRefreshToken(
            randomUUID(),
            Date.now() + 10_000,
          ),
        );
      },
      (err: GeneralError) => {
        assert.strictEqual(err instanceof GeneralError, true);
        assert.strictEqual(
          err.getClientError(response).code,
          HTTP_STATUS_CODES.UNAUTHORIZED,
        );
        return true;
      },
    );
  });
});
