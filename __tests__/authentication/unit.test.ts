import * as service from '../../src/entities/authentication/service/index.js';
import * as validator from '../../src/entities/authentication/validator.js';

import {
  after,
  assert,
  before,
  createHttpMocks,
  HTTP_STATUS_CODES,
  initServer,
  mockLogger,
  MRSError,
  randomString,
  randomUUID,
  suite,
  terminateServer,
  test,
  VALIDATION,
  type LoggerHandler,
  type ResponseWithCtx,
  type ServerParams,
} from '../utils.js';

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

  await test('Invalid - Login validation: Missing email', (ctx) => {
    const { request } = createHttpMocks<ResponseWithCtx>({
      logger,
      reqOptions: {
        body: {
          password: 'bla123',
        },
      },
    });

    const validateLoginSpy = ctx.mock.fn(validator.validateLogin);

    assert.throws(
      () => {
        validateLoginSpy(request);
      },
      (err) => {
        assert.strictEqual(err instanceof MRSError, true);
        assert.deepStrictEqual((err as MRSError).getClientError(), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: USER.EMAIL.REQUIRED_ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Login validation: Invalid email', (ctx) => {
    const { request } = createHttpMocks<ResponseWithCtx>({
      logger,
      reqOptions: {
        body: {
          email: 'a@b@c.com',
          password: 'bla123',
        },
      },
    });

    const validateLoginSpy = ctx.mock.fn(validator.validateLogin);

    assert.throws(
      () => {
        validateLoginSpy(request);
      },
      (err) => {
        assert.strictEqual(err instanceof MRSError, true);
        assert.deepStrictEqual((err as MRSError).getClientError(), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: USER.EMAIL.ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Login validation: Email too long', (ctx) => {
    const { request } = createHttpMocks<ResponseWithCtx>({
      logger,
      reqOptions: {
        body: {
          email: `${'a'.repeat(256)}@ph.com`,
          password: 'bla123',
        },
      },
    });

    const validateLoginSpy = ctx.mock.fn(validator.validateLogin);

    assert.throws(
      () => {
        validateLoginSpy(request);
      },
      (err) => {
        assert.strictEqual(err instanceof MRSError, true);
        assert.deepStrictEqual((err as MRSError).getClientError(), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: USER.EMAIL.MAX_LENGTH.ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Login validation: Missing password', (ctx) => {
    const { request } = createHttpMocks<ResponseWithCtx>({
      logger,
      reqOptions: {
        body: {
          email: 'ph@ph.com',
        },
      },
    });

    const validateLoginSpy = ctx.mock.fn(validator.validateLogin);

    assert.throws(
      () => {
        validateLoginSpy(request);
      },
      (err) => {
        assert.strictEqual(err instanceof MRSError, true);
        assert.deepStrictEqual((err as MRSError).getClientError(), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: USER.PASSWORD.REQUIRED_ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Login validation: Password too short', (ctx) => {
    const { request } = createHttpMocks<ResponseWithCtx>({
      logger,
      reqOptions: {
        body: {
          email: 'ph@ph.com',
          password: 'a'.repeat(USER.PASSWORD.MIN_LENGTH.VALUE - 1),
        },
      },
    });

    const validateLoginSpy = ctx.mock.fn(validator.validateLogin);

    assert.throws(
      () => {
        validateLoginSpy(request);
      },
      (err) => {
        assert.strictEqual(err instanceof MRSError, true);
        assert.deepStrictEqual((err as MRSError).getClientError(), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: USER.PASSWORD.MIN_LENGTH.ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Login validation: Password too long', (ctx) => {
    const { request } = createHttpMocks<ResponseWithCtx>({
      logger,
      reqOptions: {
        body: {
          email: 'ph@ph.com',
          password: 'a'.repeat(USER.PASSWORD.MAX_LENGTH.VALUE + 1),
        },
      },
    });

    const validateLoginSpy = ctx.mock.fn(validator.validateLogin);

    assert.throws(
      () => {
        validateLoginSpy(request);
      },
      (err) => {
        assert.strictEqual(err instanceof MRSError, true);
        assert.deepStrictEqual((err as MRSError).getClientError(), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: USER.PASSWORD.MAX_LENGTH.ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Login service: Non-existent user', async (ctx) => {
    const { authentication, database } = serverParams;

    const loginSpy = ctx.mock.fn(service.login);

    await assert.rejects(
      async () => {
        await loginSpy(
          {
            authentication,
            database,
            logger,
          },
          {
            email: `${randomUUID()}@ph.com`,
            password: randomString(),
          },
        );
      },
      (err) => {
        assert.strictEqual(err instanceof MRSError, true);
        assert.strictEqual(
          (err as MRSError).getClientError().code,
          HTTP_STATUS_CODES.BAD_REQUEST,
        );
        return true;
      },
    );
  });
  await test('Invalid - Login service: Incorrect password', async (ctx) => {
    const { authentication, database } = serverParams;

    ctx.mock.method(database, 'getHandler', () => {
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
    const loginSpy = ctx.mock.fn(service.login);

    await assert.rejects(
      async () => {
        await loginSpy(
          {
            authentication,
            database,
            logger,
          },
          {
            email: `${randomUUID()}@ph.com`,
            password: randomString(),
          },
        );
      },
      (err) => {
        assert.strictEqual(err instanceof MRSError, true);
        assert.strictEqual(
          (err as MRSError).getClientError().code,
          HTTP_STATUS_CODES.BAD_REQUEST,
        );
        return true;
      },
    );
  });
  await test('Invalid - Refresh validation: Missing refresh token', (ctx) => {
    const { request } = createHttpMocks<ResponseWithCtx>({
      logger,
    });

    const validateRefreshAccessTokenSpy = ctx.mock.fn(
      validator.validateRefreshAccessToken,
    );

    assert.throws(
      () => {
        validateRefreshAccessTokenSpy(request);
      },
      (err) => {
        assert.strictEqual(err instanceof MRSError, true);
        assert.deepStrictEqual((err as MRSError).getClientError(), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: AUTHENTICATION.REFRESH.TOKEN.REQUIRED_ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Refresh validation: Invalid refresh token', (ctx) => {
    const { request } = createHttpMocks<ResponseWithCtx>({
      logger,
      reqOptions: {
        body: {
          refreshToken: 'a'.repeat(64),
        },
      },
    });

    const validateRefreshAccessTokenSpy = ctx.mock.fn(
      validator.validateRefreshAccessToken,
    );

    assert.throws(
      () => {
        validateRefreshAccessTokenSpy(request);
      },
      (err) => {
        assert.strictEqual(err instanceof MRSError, true);
        assert.deepStrictEqual((err as MRSError).getClientError(), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: AUTHENTICATION.REFRESH.TOKEN.ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Refresh service: Malformed JWT', async (ctx) => {
    const { authentication, database } = serverParams;

    const refreshAccessTokenSpy = ctx.mock.fn(service.refreshAccessToken);

    await assert.rejects(
      async () => {
        await refreshAccessTokenSpy(
          {
            authentication,
            database,
            logger,
          },
          'Bearer ph',
        );
      },
      (err) => {
        assert.strictEqual(err instanceof MRSError, true);
        assert.strictEqual(
          (err as MRSError).getClientError().code,
          HTTP_STATUS_CODES.UNAUTHORIZED,
        );
        return true;
      },
    );
  });
  await test('Invalid - Refresh service: Missing JWT subject', async (ctx) => {
    const { authentication, database } = serverParams;

    ctx.mock.method(authentication, 'validateToken', async () => {
      return await Promise.resolve({
        payload: { sub: undefined },
      });
    });
    const refreshAccessTokenSpy = ctx.mock.fn(service.refreshAccessToken);

    await assert.rejects(
      async () => {
        await refreshAccessTokenSpy(
          {
            authentication,
            database,
            logger,
          },
          await authentication.generateRefreshToken(
            randomUUID(),
            Date.now() + 10_000,
          ),
        );
      },
      (err) => {
        assert.strictEqual(err instanceof MRSError, true);
        assert.strictEqual(
          (err as MRSError).getClientError().code,
          HTTP_STATUS_CODES.UNAUTHORIZED,
        );
        return true;
      },
    );
  });
});
