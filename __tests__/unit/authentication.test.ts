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
  services,
  suite,
  terminateServer,
  test,
  VALIDATION,
  validators,
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

  await suite('Login', async () => {
    await suite('Validation layer', async () => {
      await suite('Email', async () => {
        await test('Missing', (ctx) => {
          const { request } = createHttpMocks<ResponseWithCtx>({
            logger,
            reqOptions: {
              body: {
                password: 'bla123',
              },
            },
          });

          const validateLoginSpy = ctx.mock.fn(
            validators.authenticationValidator.validateLogin,
          );

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
        await test('Invalid', (ctx) => {
          const { request } = createHttpMocks<ResponseWithCtx>({
            logger,
            reqOptions: {
              body: {
                email: 'a@b@c.com',
                password: 'bla123',
              },
            },
          });

          const validateLoginSpy = ctx.mock.fn(
            validators.authenticationValidator.validateLogin,
          );

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
        await test('Too long', (ctx) => {
          const { request } = createHttpMocks<ResponseWithCtx>({
            logger,
            reqOptions: {
              body: {
                email: `${'a'.repeat(256)}@ph.com`,
                password: 'bla123',
              },
            },
          });

          const validateLoginSpy = ctx.mock.fn(
            validators.authenticationValidator.validateLogin,
          );

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
      });
      await suite('Password', async () => {
        await test('Missing', (ctx) => {
          const { request } = createHttpMocks<ResponseWithCtx>({
            logger,
            reqOptions: {
              body: {
                email: 'ph@ph.com',
              },
            },
          });

          const validateLoginSpy = ctx.mock.fn(
            validators.authenticationValidator.validateLogin,
          );

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
        await test('Too short', (ctx) => {
          const { request } = createHttpMocks<ResponseWithCtx>({
            logger,
            reqOptions: {
              body: {
                email: 'ph@ph.com',
                password: 'a'.repeat(USER.PASSWORD.MIN_LENGTH.VALUE - 1),
              },
            },
          });

          const validateLoginSpy = ctx.mock.fn(
            validators.authenticationValidator.validateLogin,
          );

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
        await test('Too long', (ctx) => {
          const { request } = createHttpMocks<ResponseWithCtx>({
            logger,
            reqOptions: {
              body: {
                email: 'ph@ph.com',
                password: 'a'.repeat(USER.PASSWORD.MAX_LENGTH.VALUE + 1),
              },
            },
          });

          const validateLoginSpy = ctx.mock.fn(
            validators.authenticationValidator.validateLogin,
          );

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
      });
    });
    await suite('Service layer', async () => {
      await test('Non-existent user', async (ctx) => {
        const { authentication, database } = serverParams;

        const requestContext = {
          authentication,
          database,
          hashSecret: Buffer.from(randomString()),
          logger,
        };
        const credentials = {
          email: `${randomUUID()}@ph.com`,
          password: randomString(),
        };
        const loginSpy = ctx.mock.fn(services.authenticationService.login);

        await assert.rejects(
          async () => {
            await loginSpy(requestContext, credentials);
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
      await test('Incorrect password', async (ctx) => {
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
        const requestContext = {
          authentication,
          database,
          hashSecret: Buffer.from(randomString()),
          logger,
        };
        const credentials = {
          email: `${randomUUID()}@ph.com`,
          password: randomString(),
        } as const;
        const loginSpy = ctx.mock.fn(services.authenticationService.login);

        await assert.rejects(
          async () => {
            await loginSpy(requestContext, credentials);
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
    });
  });

  await suite('Refresh', async () => {
    await suite('Validation layer', async () => {
      await suite('Refresh token', async () => {
        await test('Missing', (ctx) => {
          const { request } = createHttpMocks<ResponseWithCtx>({
            logger,
          });

          const validateRefreshAccessTokenSpy = ctx.mock.fn(
            validators.authenticationValidator.validateRefreshAccessToken,
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
        await test('Too long', (ctx) => {
          const { request } = createHttpMocks<ResponseWithCtx>({
            logger,
            reqOptions: {
              body: {
                refreshToken: 'a'.repeat(
                  AUTHENTICATION.REFRESH.TOKEN.MAX_LENGTH.VALUE + 1,
                ),
              },
            },
          });

          const validateRefreshAccessTokenSpy = ctx.mock.fn(
            validators.authenticationValidator.validateRefreshAccessToken,
          );

          assert.throws(
            () => {
              validateRefreshAccessTokenSpy(request);
            },
            (err) => {
              assert.strictEqual(err instanceof MRSError, true);
              assert.deepStrictEqual((err as MRSError).getClientError(), {
                code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
                message: AUTHENTICATION.REFRESH.TOKEN.MAX_LENGTH.ERROR_MESSAGE,
              });

              return true;
            },
          );
        });
      });
    });
    await suite('Service layer', async () => {
      await test('Malformed JWT', async (ctx) => {
        const { authentication, database } = serverParams;
        const requestContext = {
          authentication,
          database,
          hashSecret: Buffer.from(randomString()),
          logger,
        };
        const refreshToken = 'Bearer ph';
        const refreshAccessTokenSpy = ctx.mock.fn(
          services.authenticationService.refreshAccessToken,
        );

        await assert.rejects(
          async () => {
            await refreshAccessTokenSpy(requestContext, refreshToken);
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
      await test('Missing JWT subject', async (ctx) => {
        const { authentication, database } = serverParams;
        ctx.mock.method(authentication, 'validateToken', async () => {
          return await Promise.resolve({
            payload: { sub: undefined },
          });
        });
        const requestContext = {
          authentication,
          database,
          hashSecret: Buffer.from(randomString()),
          logger,
        };
        const refreshToken = await authentication.generateRefreshToken(
          randomUUID() as string,
          Date.now() + 10_000,
        );
        const refreshAccessTokenSpy = ctx.mock.fn(
          services.authenticationService.refreshAccessToken,
        );

        await assert.rejects(
          async () => {
            await refreshAccessTokenSpy(requestContext, refreshToken);
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
  });
});
