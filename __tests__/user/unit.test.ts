import {
  after,
  assert,
  before,
  createHttpMocks,
  getAdminRole,
  HTTP_STATUS_CODES,
  initServer,
  type LoggerHandler,
  mockLogger,
  MRSError,
  randomString,
  randomUUID,
  type ResponseWithCtx,
  type ServerParams,
  services,
  suite,
  terminateServer,
  test,
  VALIDATION,
  validators,
} from '../utils.js';

import { createUser, createUsers, generateUsersData } from './utils.js';

/**********************************************************************************/

const { USER, PAGINATION } = VALIDATION;

/**********************************************************************************/

await suite('User unit tests', async () => {
  let logger: LoggerHandler = null!;
  let serverParams: ServerParams = null!;
  before(async () => {
    ({ logger } = mockLogger());
    serverParams = await initServer();
  });
  after(() => {
    terminateServer(serverParams);
  });

  await suite('Read', async () => {
    await suite('Single', async () => {
      await suite('Validation layer', async () => {
        await suite('User id', async () => {
          await test('Missing', (ctx) => {
            const { request } = createHttpMocks<ResponseWithCtx>({
              logger,
            });

            const validateGetUserSpy = ctx.mock.fn(
              validators.userValidator.validateGetUser,
            );

            assert.throws(
              () => {
                validateGetUserSpy(request);
              },
              (err) => {
                assert.strictEqual(err instanceof MRSError, true);
                assert.deepStrictEqual((err as MRSError).getClientError(), {
                  code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
                  message: USER.ID.REQUIRED_ERROR_MESSAGE,
                });

                return true;
              },
            );
          });
          await test('Empty', (ctx) => {
            const { request } = createHttpMocks<ResponseWithCtx>({
              logger,
              reqOptions: {
                params: { userId: '' },
              },
            });

            const validateGetUserSpy = ctx.mock.fn(
              validators.userValidator.validateGetUser,
            );

            assert.throws(
              () => {
                validateGetUserSpy(request);
              },
              (err) => {
                assert.strictEqual(err instanceof MRSError, true);
                assert.deepStrictEqual((err as MRSError).getClientError(), {
                  code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
                  message: USER.ID.ERROR_MESSAGE,
                });

                return true;
              },
            );
          });
          await test('Invalid', (ctx) => {
            const { request } = createHttpMocks<ResponseWithCtx>({
              logger,
              reqOptions: {
                params: { userId: randomString() },
              },
            });

            const validateGetUserSpy = ctx.mock.fn(
              validators.userValidator.validateGetUser,
            );

            assert.throws(
              () => {
                validateGetUserSpy(request);
              },
              (err) => {
                assert.strictEqual(err instanceof MRSError, true);
                assert.deepStrictEqual((err as MRSError).getClientError(), {
                  code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
                  message: USER.ID.ERROR_MESSAGE,
                });

                return true;
              },
            );
          });
        });
      });
      await suite('Service layer', async () => {
        await test('Non-existent', async (ctx) => {
          const { authentication, database } = serverParams;
          ctx.mock.method(database, 'getHandler', () => {
            return {
              select: () => {
                return {
                  from: () => {
                    return {
                      where: () => {
                        return {
                          innerJoin: () => {
                            return [];
                          },
                        };
                      },
                    };
                  },
                };
              },
            } as const;
          });
          const getUserSpy = ctx.mock.fn(services.userService.getUser);

          await assert.rejects(
            async () => {
              await getUserSpy(
                {
                  authentication,
                  database,
                  logger,
                },
                randomUUID(),
              );
            },
            (err) => {
              assert.strictEqual(err instanceof MRSError, true);
              assert.strictEqual(
                (err as MRSError).getClientError().code,
                HTTP_STATUS_CODES.NOT_FOUND,
              );
              return true;
            },
          );
        });
      });
    });
    await suite('Multiple', async () => {
      await suite('Validation layer', async () => {
        await suite('Cursor', async () => {
          await test('Empty', (ctx) => {
            const { request } = createHttpMocks<ResponseWithCtx>({
              logger,
              reqOptions: {
                query: { cursor: '' },
              },
            });

            const validateGetUsersSpy = ctx.mock.fn(
              validators.userValidator.validateGetUsers,
            );

            assert.throws(
              () => {
                validateGetUsersSpy(request);
              },
              (err) => {
                assert.strictEqual(err instanceof MRSError, true);
                assert.deepStrictEqual((err as MRSError).getClientError(), {
                  code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
                  message: PAGINATION.CURSOR.MIN_LENGTH.ERROR_MESSAGE,
                });

                return true;
              },
            );
          });
          await test('Too short', (ctx) => {
            const { request } = createHttpMocks<ResponseWithCtx>({
              logger,
              reqOptions: {
                query: {
                  cursor: Buffer.from(
                    'a'.repeat(PAGINATION.CURSOR.MIN_LENGTH.VALUE - 1),
                  ).toString('base64'),
                },
              },
            });

            const validateGetUsersSpy = ctx.mock.fn(
              validators.userValidator.validateGetUsers,
            );

            assert.throws(
              () => {
                validateGetUsersSpy(request);
              },
              (err) => {
                assert.strictEqual(err instanceof MRSError, true);
                assert.deepStrictEqual((err as MRSError).getClientError(), {
                  code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
                  message: PAGINATION.CURSOR.MIN_LENGTH.ERROR_MESSAGE,
                });

                return true;
              },
            );
          });
          await test('Too long', (ctx) => {
            const { request } = createHttpMocks<ResponseWithCtx>({
              logger,
              reqOptions: {
                query: {
                  cursor: Buffer.from(
                    'a'.repeat(PAGINATION.CURSOR.MAX_LENGTH.VALUE + 1),
                  ).toString('base64'),
                },
              },
            });

            const validateGetUsersSpy = ctx.mock.fn(
              validators.userValidator.validateGetUsers,
            );

            assert.throws(
              () => {
                validateGetUsersSpy(request);
              },
              (err) => {
                assert.strictEqual(err instanceof MRSError, true);
                assert.deepStrictEqual((err as MRSError).getClientError(), {
                  code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
                  message: PAGINATION.CURSOR.MAX_LENGTH.ERROR_MESSAGE,
                });

                return true;
              },
            );
          });
          await test('Invalid', (ctx) => {
            const { request } = createHttpMocks<ResponseWithCtx>({
              logger,
              reqOptions: {
                query: { cursor: Buffer.from(randomUUID()).toString('base64') },
              },
            });

            const validateGetUsersSpy = ctx.mock.fn(
              validators.userValidator.validateGetUsers,
            );

            assert.throws(
              () => {
                validateGetUsersSpy(request);
              },
              (err) => {
                assert.strictEqual(err instanceof MRSError, true);
                assert.deepStrictEqual((err as MRSError).getClientError(), {
                  code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
                  message: PAGINATION.CURSOR.ERROR_MESSAGE,
                });

                return true;
              },
            );
          });
        });
        await suite('Page size', async () => {
          await test('Too low', (ctx) => {
            const { request } = createHttpMocks<ResponseWithCtx>({
              logger,
              reqOptions: {
                query: {
                  pageSize: PAGINATION.PAGE_SIZE.MIN_LENGTH.VALUE - 1,
                },
              },
            });

            const validateGetUsersSpy = ctx.mock.fn(
              validators.userValidator.validateGetUsers,
            );

            assert.throws(
              () => {
                validateGetUsersSpy(request);
              },
              (err) => {
                assert.strictEqual(err instanceof MRSError, true);
                assert.deepStrictEqual((err as MRSError).getClientError(), {
                  code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
                  message: PAGINATION.PAGE_SIZE.MIN_LENGTH.ERROR_MESSAGE,
                });

                return true;
              },
            );
          });
          await test('Too high', (ctx) => {
            const { request } = createHttpMocks<ResponseWithCtx>({
              logger,
              reqOptions: {
                query: {
                  pageSize: PAGINATION.PAGE_SIZE.MAX_LENGTH.VALUE + 1,
                },
              },
            });

            const validateGetUsersSpy = ctx.mock.fn(
              validators.userValidator.validateGetUsers,
            );

            assert.throws(
              () => {
                validateGetUsersSpy(request);
              },
              (err) => {
                assert.strictEqual(err instanceof MRSError, true);
                assert.deepStrictEqual((err as MRSError).getClientError(), {
                  code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
                  message: PAGINATION.PAGE_SIZE.MAX_LENGTH.ERROR_MESSAGE,
                });

                return true;
              },
            );
          });
          await test('Invalid', (ctx) => {
            const { request } = createHttpMocks<ResponseWithCtx>({
              logger,
              reqOptions: {
                query: { pageSize: randomString(8) },
              },
            });

            const validateGetUsersSpy = ctx.mock.fn(
              validators.userValidator.validateGetUsers,
            );

            assert.throws(
              () => {
                validateGetUsersSpy(request);
              },
              (err) => {
                assert.strictEqual(err instanceof MRSError, true);
                assert.deepStrictEqual((err as MRSError).getClientError(), {
                  code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
                  message: PAGINATION.PAGE_SIZE.INVALID_TYPE_ERROR_MESSAGE,
                });

                return true;
              },
            );
          });
        });
      });
    });
  });
  await suite('Create', async () => {
    await suite('Validation layer', async () => {
      await suite('First name', async () => {
        await test('Missing', (ctx) => {
          const { request } = createHttpMocks<ResponseWithCtx>({
            logger,
            reqOptions: {
              body: {
                ...generateUsersData([randomUUID()], 1),
                firstName: undefined,
              },
            },
          });

          const validateCreateUserSpy = ctx.mock.fn(
            validators.userValidator.validateCreateUser,
          );

          assert.throws(
            () => {
              validateCreateUserSpy(request);
            },
            (err) => {
              assert.strictEqual(err instanceof MRSError, true);
              assert.deepStrictEqual((err as MRSError).getClientError(), {
                code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
                message: USER.FIRST_NAME.REQUIRED_ERROR_MESSAGE,
              });

              return true;
            },
          );
        });
        await test('Empty', (ctx) => {
          const { request } = createHttpMocks<ResponseWithCtx>({
            logger,
            reqOptions: {
              body: {
                ...generateUsersData([randomUUID()], 1),
                firstName: '',
              },
            },
          });

          const validateCreateUserSpy = ctx.mock.fn(
            validators.userValidator.validateCreateUser,
          );

          assert.throws(
            () => {
              validateCreateUserSpy(request);
            },
            (err) => {
              assert.strictEqual(err instanceof MRSError, true);
              assert.deepStrictEqual((err as MRSError).getClientError(), {
                code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
                message: USER.FIRST_NAME.MIN_LENGTH.ERROR_MESSAGE,
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
                ...generateUsersData([randomUUID()], 1),
                firstName: 'a'.repeat(USER.FIRST_NAME.MIN_LENGTH.VALUE - 1),
              },
            },
          });

          const validateCreateUserSpy = ctx.mock.fn(
            validators.userValidator.validateCreateUser,
          );

          assert.throws(
            () => {
              validateCreateUserSpy(request);
            },
            (err) => {
              assert.strictEqual(err instanceof MRSError, true);
              assert.deepStrictEqual((err as MRSError).getClientError(), {
                code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
                message: USER.FIRST_NAME.MIN_LENGTH.ERROR_MESSAGE,
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
                ...generateUsersData([randomUUID()], 1),
                firstName: 'a'.repeat(USER.FIRST_NAME.MAX_LENGTH.VALUE + 1),
              },
            },
          });

          const validateCreateUserSpy = ctx.mock.fn(
            validators.userValidator.validateCreateUser,
          );

          assert.throws(
            () => {
              validateCreateUserSpy(request);
            },
            (err) => {
              assert.strictEqual(err instanceof MRSError, true);
              assert.deepStrictEqual((err as MRSError).getClientError(), {
                code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
                message: USER.FIRST_NAME.MAX_LENGTH.ERROR_MESSAGE,
              });

              return true;
            },
          );
        });
      });
      await suite('Last name', async () => {
        await test('Missing', (ctx) => {
          const { request } = createHttpMocks<ResponseWithCtx>({
            logger,
            reqOptions: {
              body: {
                ...generateUsersData([randomUUID()], 1),
                lastName: undefined,
              },
            },
          });

          const validateCreateUserSpy = ctx.mock.fn(
            validators.userValidator.validateCreateUser,
          );

          assert.throws(
            () => {
              validateCreateUserSpy(request);
            },
            (err) => {
              assert.strictEqual(err instanceof MRSError, true);
              assert.deepStrictEqual((err as MRSError).getClientError(), {
                code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
                message: USER.LAST_NAME.REQUIRED_ERROR_MESSAGE,
              });

              return true;
            },
          );
        });
        await test('Empty', (ctx) => {
          const { request } = createHttpMocks<ResponseWithCtx>({
            logger,
            reqOptions: {
              body: {
                ...generateUsersData([randomUUID()], 1),
                lastName: '',
              },
            },
          });

          const validateCreateUserSpy = ctx.mock.fn(
            validators.userValidator.validateCreateUser,
          );

          assert.throws(
            () => {
              validateCreateUserSpy(request);
            },
            (err) => {
              assert.strictEqual(err instanceof MRSError, true);
              assert.deepStrictEqual((err as MRSError).getClientError(), {
                code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
                message: USER.LAST_NAME.MIN_LENGTH.ERROR_MESSAGE,
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
                ...generateUsersData([randomUUID()], 1),
                lastName: 'a'.repeat(USER.LAST_NAME.MIN_LENGTH.VALUE - 1),
              },
            },
          });

          const validateCreateUserSpy = ctx.mock.fn(
            validators.userValidator.validateCreateUser,
          );

          assert.throws(
            () => {
              validateCreateUserSpy(request);
            },
            (err) => {
              assert.strictEqual(err instanceof MRSError, true);
              assert.deepStrictEqual((err as MRSError).getClientError(), {
                code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
                message: USER.LAST_NAME.MIN_LENGTH.ERROR_MESSAGE,
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
                ...generateUsersData([randomUUID()], 1),
                lastName: 'a'.repeat(USER.LAST_NAME.MAX_LENGTH.VALUE + 1),
              },
            },
          });

          const validateCreateUserSpy = ctx.mock.fn(
            validators.userValidator.validateCreateUser,
          );

          assert.throws(
            () => {
              validateCreateUserSpy(request);
            },
            (err) => {
              assert.strictEqual(err instanceof MRSError, true);
              assert.deepStrictEqual((err as MRSError).getClientError(), {
                code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
                message: USER.LAST_NAME.MAX_LENGTH.ERROR_MESSAGE,
              });

              return true;
            },
          );
        });
      });
      await suite('Email', async () => {
        await test('Missing', (ctx) => {
          const { request } = createHttpMocks<ResponseWithCtx>({
            logger,
            reqOptions: {
              body: {
                ...generateUsersData([randomUUID()], 1),
                email: undefined,
              },
            },
          });

          const validateCreateUserSpy = ctx.mock.fn(
            validators.userValidator.validateCreateUser,
          );

          assert.throws(
            () => {
              validateCreateUserSpy(request);
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
        await test('Empty', (ctx) => {
          const { request } = createHttpMocks<ResponseWithCtx>({
            logger,
            reqOptions: {
              body: {
                ...generateUsersData([randomUUID()], 1),
                email: '',
              },
            },
          });

          const validateCreateUserSpy = ctx.mock.fn(
            validators.userValidator.validateCreateUser,
          );

          assert.throws(
            () => {
              validateCreateUserSpy(request);
            },
            (err) => {
              assert.strictEqual(err instanceof MRSError, true);
              assert.deepStrictEqual((err as MRSError).getClientError(), {
                code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
                message: `${USER.EMAIL.MIN_LENGTH.ERROR_MESSAGE}, ${USER.EMAIL.ERROR_MESSAGE}`,
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
                ...generateUsersData([randomUUID()], 1),
                email: 'a'.repeat(USER.EMAIL.MIN_LENGTH.VALUE - 1),
              },
            },
          });

          const validateCreateUserSpy = ctx.mock.fn(
            validators.userValidator.validateCreateUser,
          );

          assert.throws(
            () => {
              validateCreateUserSpy(request);
            },
            (err) => {
              assert.strictEqual(err instanceof MRSError, true);
              assert.deepStrictEqual((err as MRSError).getClientError(), {
                code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
                message: `${USER.EMAIL.MIN_LENGTH.ERROR_MESSAGE}, ${USER.EMAIL.ERROR_MESSAGE}`,
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
                ...generateUsersData([randomUUID()], 1),
                email: `${'a'.repeat(USER.EMAIL.MAX_LENGTH.VALUE + 1)}@ph.com`,
              },
            },
          });

          const validateCreateUserSpy = ctx.mock.fn(
            validators.userValidator.validateCreateUser,
          );

          assert.throws(
            () => {
              validateCreateUserSpy(request);
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
        await test('Invalid', (ctx) => {
          const { request } = createHttpMocks<ResponseWithCtx>({
            logger,
            reqOptions: {
              body: {
                ...generateUsersData([randomUUID()], 1),
                email: randomString(),
              },
            },
          });

          const validateCreateUserSpy = ctx.mock.fn(
            validators.userValidator.validateCreateUser,
          );

          assert.throws(
            () => {
              validateCreateUserSpy(request);
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
      });
      await suite('Password', async () => {
        await test('Missing', (ctx) => {
          const { request } = createHttpMocks<ResponseWithCtx>({
            logger,
            reqOptions: {
              body: {
                ...generateUsersData([randomUUID()], 1),
                password: undefined,
              },
            },
          });

          const validateCreateUserSpy = ctx.mock.fn(
            validators.userValidator.validateCreateUser,
          );

          assert.throws(
            () => {
              validateCreateUserSpy(request);
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
        await test('Empty', (ctx) => {
          const { request } = createHttpMocks<ResponseWithCtx>({
            logger,
            reqOptions: {
              body: {
                ...generateUsersData([randomUUID()], 1),
                password: '',
              },
            },
          });

          const validateCreateUserSpy = ctx.mock.fn(
            validators.userValidator.validateCreateUser,
          );

          assert.throws(
            () => {
              validateCreateUserSpy(request);
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
        await test('Too short', (ctx) => {
          const { request } = createHttpMocks<ResponseWithCtx>({
            logger,
            reqOptions: {
              body: {
                ...generateUsersData([randomUUID()], 1),
                password: 'a'.repeat(USER.PASSWORD.MIN_LENGTH.VALUE - 1),
              },
            },
          });

          const validateCreateUserSpy = ctx.mock.fn(
            validators.userValidator.validateCreateUser,
          );

          assert.throws(
            () => {
              validateCreateUserSpy(request);
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
                ...generateUsersData([randomUUID()], 1),
                password: 'a'.repeat(USER.PASSWORD.MAX_LENGTH.VALUE + 1),
              },
            },
          });

          const validateCreateUserSpy = ctx.mock.fn(
            validators.userValidator.validateCreateUser,
          );

          assert.throws(
            () => {
              validateCreateUserSpy(request);
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
      await suite('Role id', async () => {
        await test('Missing', (ctx) => {
          const { request } = createHttpMocks<ResponseWithCtx>({
            logger,
            reqOptions: {
              body: {
                ...generateUsersData([randomUUID()], 1),
                roleId: undefined,
              },
            },
          });

          const validateCreateUserSpy = ctx.mock.fn(
            validators.userValidator.validateCreateUser,
          );

          assert.throws(
            () => {
              validateCreateUserSpy(request);
            },
            (err) => {
              assert.strictEqual(err instanceof MRSError, true);
              assert.deepStrictEqual((err as MRSError).getClientError(), {
                code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
                message: USER.ROLE_ID.REQUIRED_ERROR_MESSAGE,
              });

              return true;
            },
          );
        });
        await test('Empty', (ctx) => {
          const { request } = createHttpMocks<ResponseWithCtx>({
            logger,
            reqOptions: {
              body: {
                ...generateUsersData([randomUUID()], 1),
                roleId: '',
              },
            },
          });

          const validateCreateUserSpy = ctx.mock.fn(
            validators.userValidator.validateCreateUser,
          );

          assert.throws(
            () => {
              validateCreateUserSpy(request);
            },
            (err) => {
              assert.strictEqual(err instanceof MRSError, true);
              assert.deepStrictEqual((err as MRSError).getClientError(), {
                code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
                message: USER.ROLE_ID.ERROR_MESSAGE,
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
                ...generateUsersData([randomUUID()], 1),
                roleId: randomString(),
              },
            },
          });

          const validateCreateUserSpy = ctx.mock.fn(
            validators.userValidator.validateCreateUser,
          );

          assert.throws(
            () => {
              validateCreateUserSpy(request);
            },
            (err) => {
              assert.strictEqual(err instanceof MRSError, true);
              assert.deepStrictEqual((err as MRSError).getClientError(), {
                code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
                message: USER.ROLE_ID.ERROR_MESSAGE,
              });

              return true;
            },
          );
        });
      });
    });
    await suite('Service layer', async () => {
      await test('Duplicate', async () => {
        const { id: roleId } = getAdminRole();
        await createUser(
          serverParams,
          generateUsersData([roleId]),
          async (_, user) => {
            await assert.rejects(
              async () => {
                await services.userService.createUser(
                  {
                    authentication: serverParams.authentication,
                    database: serverParams.database,
                    logger,
                  },
                  {
                    ...generateUsersData([roleId]),
                    email: user.email,
                  },
                );
              },
              (err) => {
                assert.strictEqual(err instanceof MRSError, true);
                assert.deepStrictEqual((err as MRSError).getClientError(), {
                  code: HTTP_STATUS_CODES.CONFLICT,
                  message: `User '${user.email}' already exists`,
                });

                return true;
              },
            );
          },
        );
      });
      await test('Non-existent role id', async () => {
        const roleId = randomUUID();

        await assert.rejects(
          async () => {
            await services.userService.createUser(
              {
                authentication: serverParams.authentication,
                database: serverParams.database,
                logger,
              },
              generateUsersData([roleId]),
            );
          },
          (err) => {
            assert.strictEqual(err instanceof MRSError, true);
            assert.deepStrictEqual((err as MRSError).getClientError(), {
              code: HTTP_STATUS_CODES.NOT_FOUND,
              message: `Role '${roleId}' does not exist`,
            });

            return true;
          },
        );
      });
    });
  });
  await suite('Update', async () => {
    await suite('Validation layer', async () => {
      await test('No updates', (ctx) => {
        const { request } = createHttpMocks<ResponseWithCtx>({
          logger,
          reqOptions: {
            params: { userId: randomUUID() },
          },
        });

        const validateUpdateUserSpy = ctx.mock.fn(
          validators.userValidator.validateUpdateUser,
        );

        assert.throws(
          () => {
            validateUpdateUserSpy(request);
          },
          (err) => {
            assert.strictEqual(err instanceof MRSError, true);
            assert.deepStrictEqual((err as MRSError).getClientError(), {
              code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
              message: USER.NO_FIELDS_TO_UPDATE_ERROR_MESSAGE,
            });

            return true;
          },
        );
      });
      await suite('User id', async () => {
        await test('Missing', (ctx) => {
          const { request } = createHttpMocks<ResponseWithCtx>({
            logger,
            reqOptions: { body: { roleId: randomUUID() } },
          });

          const validateUpdateUserSpy = ctx.mock.fn(
            validators.userValidator.validateUpdateUser,
          );

          assert.throws(
            () => {
              validateUpdateUserSpy(request);
            },
            (err) => {
              assert.strictEqual(err instanceof MRSError, true);
              assert.deepStrictEqual((err as MRSError).getClientError(), {
                code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
                message: USER.ID.REQUIRED_ERROR_MESSAGE,
              });

              return true;
            },
          );
        });
        await test('Empty', (ctx) => {
          const { request } = createHttpMocks<ResponseWithCtx>({
            logger,
            reqOptions: {
              params: { userId: '' },
              body: { roleId: randomUUID() },
            },
          });

          const validateUpdateUserSpy = ctx.mock.fn(
            validators.userValidator.validateUpdateUser,
          );

          assert.throws(
            () => {
              validateUpdateUserSpy(request);
            },
            (err) => {
              assert.strictEqual(err instanceof MRSError, true);
              assert.deepStrictEqual((err as MRSError).getClientError(), {
                code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
                message: USER.ID.ERROR_MESSAGE,
              });

              return true;
            },
          );
        });
        await test('Invalid', (ctx) => {
          const { request } = createHttpMocks<ResponseWithCtx>({
            logger,
            reqOptions: {
              params: { userId: randomString() },
              body: { roleId: randomUUID() },
            },
          });

          const validateUpdateUserSpy = ctx.mock.fn(
            validators.userValidator.validateUpdateUser,
          );

          assert.throws(
            () => {
              validateUpdateUserSpy(request);
            },
            (err) => {
              assert.strictEqual(err instanceof MRSError, true);
              assert.deepStrictEqual((err as MRSError).getClientError(), {
                code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
                message: USER.ID.ERROR_MESSAGE,
              });

              return true;
            },
          );
        });
      });
      await suite('First name', async () => {
        await test('Empty', (ctx) => {
          const { request } = createHttpMocks<ResponseWithCtx>({
            logger,
            reqOptions: {
              params: { userId: randomUUID() },
              body: { firstName: '', roleId: randomUUID() },
            },
          });

          const validateUpdateUserSpy = ctx.mock.fn(
            validators.userValidator.validateUpdateUser,
          );

          assert.throws(
            () => {
              validateUpdateUserSpy(request);
            },
            (err) => {
              assert.strictEqual(err instanceof MRSError, true);
              assert.deepStrictEqual((err as MRSError).getClientError(), {
                code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
                message: USER.FIRST_NAME.MIN_LENGTH.ERROR_MESSAGE,
              });

              return true;
            },
          );
        });
        await test('Too short', (ctx) => {
          const { request } = createHttpMocks<ResponseWithCtx>({
            logger,
            reqOptions: {
              params: { userId: randomUUID() },
              body: {
                firstName: 'a'.repeat(USER.FIRST_NAME.MIN_LENGTH.VALUE - 1),
                roleId: randomUUID(),
              },
            },
          });

          const validateUpdateUserSpy = ctx.mock.fn(
            validators.userValidator.validateUpdateUser,
          );

          assert.throws(
            () => {
              validateUpdateUserSpy(request);
            },
            (err) => {
              assert.strictEqual(err instanceof MRSError, true);
              assert.deepStrictEqual((err as MRSError).getClientError(), {
                code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
                message: USER.FIRST_NAME.MIN_LENGTH.ERROR_MESSAGE,
              });

              return true;
            },
          );
        });
        await test('Too long', (ctx) => {
          const { request } = createHttpMocks<ResponseWithCtx>({
            logger,
            reqOptions: {
              params: { userId: randomUUID() },
              body: {
                firstName: 'a'.repeat(USER.FIRST_NAME.MAX_LENGTH.VALUE + 1),
                roleId: randomUUID(),
              },
            },
          });

          const validateUpdateUserSpy = ctx.mock.fn(
            validators.userValidator.validateUpdateUser,
          );

          assert.throws(
            () => {
              validateUpdateUserSpy(request);
            },
            (err) => {
              assert.strictEqual(err instanceof MRSError, true);
              assert.deepStrictEqual((err as MRSError).getClientError(), {
                code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
                message: USER.FIRST_NAME.MAX_LENGTH.ERROR_MESSAGE,
              });

              return true;
            },
          );
        });
      });
      await suite('Last name', async () => {
        await test('Empty', (ctx) => {
          const { request } = createHttpMocks<ResponseWithCtx>({
            logger,
            reqOptions: {
              params: { userId: randomUUID() },
              body: { lastName: '', roleId: randomUUID() },
            },
          });

          const validateUpdateUserSpy = ctx.mock.fn(
            validators.userValidator.validateUpdateUser,
          );

          assert.throws(
            () => {
              validateUpdateUserSpy(request);
            },
            (err) => {
              assert.strictEqual(err instanceof MRSError, true);
              assert.deepStrictEqual((err as MRSError).getClientError(), {
                code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
                message: USER.LAST_NAME.MIN_LENGTH.ERROR_MESSAGE,
              });

              return true;
            },
          );
        });
        await test('Too short', (ctx) => {
          const { request } = createHttpMocks<ResponseWithCtx>({
            logger,
            reqOptions: {
              params: { userId: randomUUID() },
              body: {
                lastName: 'a'.repeat(USER.LAST_NAME.MIN_LENGTH.VALUE - 1),
                roleId: randomUUID(),
              },
            },
          });

          const validateUpdateUserSpy = ctx.mock.fn(
            validators.userValidator.validateUpdateUser,
          );

          assert.throws(
            () => {
              validateUpdateUserSpy(request);
            },
            (err) => {
              assert.strictEqual(err instanceof MRSError, true);
              assert.deepStrictEqual((err as MRSError).getClientError(), {
                code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
                message: USER.LAST_NAME.MIN_LENGTH.ERROR_MESSAGE,
              });

              return true;
            },
          );
        });
        await test('Too long', (ctx) => {
          const { request } = createHttpMocks<ResponseWithCtx>({
            logger,
            reqOptions: {
              params: { userId: randomUUID() },
              body: {
                lastName: 'a'.repeat(USER.LAST_NAME.MAX_LENGTH.VALUE + 1),
                roleId: randomUUID(),
              },
            },
          });

          const validateUpdateUserSpy = ctx.mock.fn(
            validators.userValidator.validateUpdateUser,
          );

          assert.throws(
            () => {
              validateUpdateUserSpy(request);
            },
            (err) => {
              assert.strictEqual(err instanceof MRSError, true);
              assert.deepStrictEqual((err as MRSError).getClientError(), {
                code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
                message: USER.LAST_NAME.MAX_LENGTH.ERROR_MESSAGE,
              });

              return true;
            },
          );
        });
      });
      await suite('Email', async () => {
        await test('Empty', (ctx) => {
          const { request } = createHttpMocks<ResponseWithCtx>({
            logger,
            reqOptions: {
              params: { userId: randomUUID() },
              body: { email: '', roleId: randomUUID() },
            },
          });

          const validateUpdateUserSpy = ctx.mock.fn(
            validators.userValidator.validateUpdateUser,
          );

          assert.throws(
            () => {
              validateUpdateUserSpy(request);
            },
            (err) => {
              assert.strictEqual(err instanceof MRSError, true);
              assert.deepStrictEqual((err as MRSError).getClientError(), {
                code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
                message: `${USER.EMAIL.MIN_LENGTH.ERROR_MESSAGE}, ${USER.EMAIL.ERROR_MESSAGE}`,
              });

              return true;
            },
          );
        });
        await test('Too short', (ctx) => {
          const { request } = createHttpMocks<ResponseWithCtx>({
            logger,
            reqOptions: {
              params: { userId: randomUUID() },
              body: {
                email: 'a'.repeat(USER.EMAIL.MIN_LENGTH.VALUE - 1),
                roleId: randomUUID(),
              },
            },
          });

          const validateUpdateUserSpy = ctx.mock.fn(
            validators.userValidator.validateUpdateUser,
          );

          assert.throws(
            () => {
              validateUpdateUserSpy(request);
            },
            (err) => {
              assert.strictEqual(err instanceof MRSError, true);
              assert.deepStrictEqual((err as MRSError).getClientError(), {
                code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
                message: `${USER.EMAIL.MIN_LENGTH.ERROR_MESSAGE}, ${USER.EMAIL.ERROR_MESSAGE}`,
              });

              return true;
            },
          );
        });
        await test('Too long', (ctx) => {
          const { request } = createHttpMocks<ResponseWithCtx>({
            logger,
            reqOptions: {
              params: { userId: randomUUID() },
              body: {
                email: `${'a'.repeat(USER.EMAIL.MAX_LENGTH.VALUE + 1)}@ph.com`,
                roleId: randomUUID(),
              },
            },
          });

          const validateUpdateUserSpy = ctx.mock.fn(
            validators.userValidator.validateUpdateUser,
          );

          assert.throws(
            () => {
              validateUpdateUserSpy(request);
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
        await test('Invalid', (ctx) => {
          const { request } = createHttpMocks<ResponseWithCtx>({
            logger,
            reqOptions: {
              params: { userId: randomUUID() },
              body: { email: randomString(32), roleId: randomUUID() },
            },
          });

          const validateUpdateUserSpy = ctx.mock.fn(
            validators.userValidator.validateUpdateUser,
          );

          assert.throws(
            () => {
              validateUpdateUserSpy(request);
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
      });
      await suite('Password', async () => {
        await test('Empty', (ctx) => {
          const { request } = createHttpMocks<ResponseWithCtx>({
            logger,
            reqOptions: {
              params: { userId: randomUUID() },
              body: { password: '', roleId: randomUUID() },
            },
          });

          const validateUpdateUserSpy = ctx.mock.fn(
            validators.userValidator.validateUpdateUser,
          );

          assert.throws(
            () => {
              validateUpdateUserSpy(request);
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
        await test('Too short', (ctx) => {
          const { request } = createHttpMocks<ResponseWithCtx>({
            logger,
            reqOptions: {
              params: { userId: randomUUID() },
              body: {
                password: 'a'.repeat(USER.PASSWORD.MIN_LENGTH.VALUE - 1),
                roleId: randomUUID(),
              },
            },
          });

          const validateUpdateUserSpy = ctx.mock.fn(
            validators.userValidator.validateUpdateUser,
          );

          assert.throws(
            () => {
              validateUpdateUserSpy(request);
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
              params: { userId: randomUUID() },
              body: {
                password: 'a'.repeat(USER.PASSWORD.MAX_LENGTH.VALUE + 1),
                roleId: randomUUID(),
              },
            },
          });

          const validateUpdateUserSpy = ctx.mock.fn(
            validators.userValidator.validateUpdateUser,
          );

          assert.throws(
            () => {
              validateUpdateUserSpy(request);
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
      await suite('Role id', async () => {
        await test('Empty', (ctx) => {
          const { request } = createHttpMocks<ResponseWithCtx>({
            logger,
            reqOptions: {
              params: { userId: randomUUID() },
              body: { firstName: randomString(), roleId: '' },
            },
          });

          const validateUpdateUserSpy = ctx.mock.fn(
            validators.userValidator.validateUpdateUser,
          );

          assert.throws(
            () => {
              validateUpdateUserSpy(request);
            },
            (err) => {
              assert.strictEqual(err instanceof MRSError, true);
              assert.deepStrictEqual((err as MRSError).getClientError(), {
                code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
                message: USER.ROLE_ID.ERROR_MESSAGE,
              });

              return true;
            },
          );
        });
        await test('Invalid', (ctx) => {
          const { request } = createHttpMocks<ResponseWithCtx>({
            logger,
            reqOptions: {
              params: { userId: randomUUID() },
              body: { firstName: randomString(), roleId: randomString() },
            },
          });

          const validateUpdateUserSpy = ctx.mock.fn(
            validators.userValidator.validateUpdateUser,
          );

          assert.throws(
            () => {
              validateUpdateUserSpy(request);
            },
            (err) => {
              assert.strictEqual(err instanceof MRSError, true);
              assert.deepStrictEqual((err as MRSError).getClientError(), {
                code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
                message: USER.ROLE_ID.ERROR_MESSAGE,
              });

              return true;
            },
          );
        });
      });
    });
    await suite('Service layer', async () => {
      await test('Non-existent', async () => {
        const userId = randomUUID();

        await assert.rejects(
          async () => {
            await services.userService.updateUser(
              {
                authentication: serverParams.authentication,
                database: serverParams.database,
                logger,
              },
              {
                userId,
                firstName: randomString(16),
              },
            );
          },
          (err) => {
            assert.strictEqual(err instanceof MRSError, true);
            assert.deepStrictEqual((err as MRSError).getClientError(), {
              code: HTTP_STATUS_CODES.NOT_FOUND,
              message: `User '${userId}' does not exist`,
            });

            return true;
          },
        );
      });
      await test('Duplicate', async () => {
        const { id: roleId } = getAdminRole();
        await createUsers(
          serverParams,
          generateUsersData([roleId], 2),
          async (_, users) => {
            await assert.rejects(
              async () => {
                await services.userService.updateUser(
                  {
                    authentication: serverParams.authentication,
                    database: serverParams.database,
                    logger,
                  },
                  {
                    userId: users[0]!.id,
                    email: users[1]!.email,
                  },
                );
              },
              (err) => {
                assert.strictEqual(err instanceof MRSError, true);
                assert.deepStrictEqual((err as MRSError).getClientError(), {
                  code: HTTP_STATUS_CODES.CONFLICT,
                  message: `User '${users[1]!.email}' already exists`,
                });

                return true;
              },
            );
          },
        );
      });
      await test('Non-existent role id', async () => {
        const { id: roleId } = getAdminRole();
        const updatedRoleId = randomUUID();
        await createUser(
          serverParams,
          generateUsersData([roleId]),
          async (_, user) => {
            await assert.rejects(
              async () => {
                await services.userService.updateUser(
                  {
                    authentication: serverParams.authentication,
                    database: serverParams.database,
                    logger,
                  },
                  {
                    userId: user.id,
                    roleId: updatedRoleId,
                  },
                );
              },
              (err) => {
                assert.strictEqual(err instanceof MRSError, true);
                assert.deepStrictEqual((err as MRSError).getClientError(), {
                  code: HTTP_STATUS_CODES.NOT_FOUND,
                  message: `Role '${updatedRoleId}' does not exist`,
                });

                return true;
              },
            );
          },
        );
      });
    });
  });
  await suite('Delete', async () => {
    await suite('Validation layer', async () => {
      await suite('User id', async () => {
        await test('Missing', (ctx) => {
          const { request } = createHttpMocks<ResponseWithCtx>({
            logger,
          });

          const validateDeleteUserSpy = ctx.mock.fn(
            validators.userValidator.validateDeleteUser,
          );

          assert.throws(
            () => {
              validateDeleteUserSpy(request);
            },
            (err) => {
              assert.strictEqual(err instanceof MRSError, true);
              assert.deepStrictEqual((err as MRSError).getClientError(), {
                code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
                message: USER.ID.REQUIRED_ERROR_MESSAGE,
              });

              return true;
            },
          );
        });
        await test('Empty', (ctx) => {
          const { request } = createHttpMocks<ResponseWithCtx>({
            logger,
            reqOptions: { params: { userId: '' } },
          });

          const validateDeleteUserSpy = ctx.mock.fn(
            validators.userValidator.validateDeleteUser,
          );

          assert.throws(
            () => {
              validateDeleteUserSpy(request);
            },
            (err) => {
              assert.strictEqual(err instanceof MRSError, true);
              assert.deepStrictEqual((err as MRSError).getClientError(), {
                code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
                message: USER.ID.ERROR_MESSAGE,
              });

              return true;
            },
          );
        });
        await test('Invalid', (ctx) => {
          const { request } = createHttpMocks<ResponseWithCtx>({
            logger,
            reqOptions: { params: { userId: randomString() } },
          });

          const validateDeleteUserSpy = ctx.mock.fn(
            validators.userValidator.validateDeleteUser,
          );

          assert.throws(
            () => {
              validateDeleteUserSpy(request);
            },
            (err) => {
              assert.strictEqual(err instanceof MRSError, true);
              assert.deepStrictEqual((err as MRSError).getClientError(), {
                code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
                message: USER.ID.ERROR_MESSAGE,
              });

              return true;
            },
          );
        });
      });
    });
  });
});
