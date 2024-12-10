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

import { createRole, createRoles, generateRolesData } from './utils.js';

/**********************************************************************************/

const { ROLE } = VALIDATION;

/**********************************************************************************/

await suite('Role unit tests', async () => {
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
    // TODO Decide on permissions and check them
  });
  await suite('Create', async () => {
    await suite('Validation layer', async () => {
      await suite('Name', async () => {
        await test('Missing', (ctx) => {
          const { request } = createHttpMocks<ResponseWithCtx>({
            logger,
          });

          const validateCreateRoleSpy = ctx.mock.fn(
            validators.roleValidator.validateCreateRole,
          );

          assert.throws(
            () => {
              validateCreateRoleSpy(request);
            },
            (err) => {
              assert.strictEqual(err instanceof MRSError, true);
              assert.deepStrictEqual((err as MRSError).getClientError(), {
                code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
                message: ROLE.NAME.REQUIRED_ERROR_MESSAGE,
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
                name: '',
              },
            },
          });

          const validateCreateRoleSpy = ctx.mock.fn(
            validators.roleValidator.validateCreateRole,
          );

          assert.throws(
            () => {
              validateCreateRoleSpy(request);
            },
            (err) => {
              assert.strictEqual(err instanceof MRSError, true);
              assert.deepStrictEqual((err as MRSError).getClientError(), {
                code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
                message: ROLE.NAME.MIN_LENGTH.ERROR_MESSAGE,
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
                name: 'a'.repeat(ROLE.NAME.MIN_LENGTH.VALUE - 1),
              },
            },
          });

          const validateCreateRoleSpy = ctx.mock.fn(
            validators.roleValidator.validateCreateRole,
          );

          assert.throws(
            () => {
              validateCreateRoleSpy(request);
            },
            (err) => {
              assert.strictEqual(err instanceof MRSError, true);
              assert.deepStrictEqual((err as MRSError).getClientError(), {
                code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
                message: ROLE.NAME.MIN_LENGTH.ERROR_MESSAGE,
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
                name: 'a'.repeat(ROLE.NAME.MAX_LENGTH.VALUE + 1),
              },
            },
          });

          const validateCreateRoleSpy = ctx.mock.fn(
            validators.roleValidator.validateCreateRole,
          );

          assert.throws(
            () => {
              validateCreateRoleSpy(request);
            },
            (err) => {
              assert.strictEqual(err instanceof MRSError, true);
              assert.deepStrictEqual((err as MRSError).getClientError(), {
                code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
                message: ROLE.NAME.MAX_LENGTH.ERROR_MESSAGE,
              });

              return true;
            },
          );
        });
      });
    });
    await suite('Service layer', async () => {
      await test('Duplicate', async () => {
        await createRole(serverParams, generateRolesData(), async (_, role) => {
          const context = {
            authentication: serverParams.authentication,
            database: serverParams.database,
            logger,
          };
          const roleToCreate = { name: role.name };

          await assert.rejects(
            async () => {
              await services.roleService.createRole(context, roleToCreate);
            },
            (err) => {
              assert.strictEqual(err instanceof MRSError, true);
              assert.deepStrictEqual((err as MRSError).getClientError(), {
                code: HTTP_STATUS_CODES.CONFLICT,
                message: `Role '${role.name}' already exists`,
              });

              return true;
            },
          );
        });
      });
    });
  });
  await suite('Update', async () => {
    await suite('Validation layer', async () => {
      await test('No updates', (ctx) => {
        const { request } = createHttpMocks<ResponseWithCtx>({
          logger,
          reqOptions: {
            params: {
              roleId: randomUUID(),
            },
          },
        });

        const validateUpdateRoleSpy = ctx.mock.fn(
          validators.roleValidator.validateUpdateRole,
        );

        assert.throws(
          () => {
            validateUpdateRoleSpy(request);
          },
          (err) => {
            assert.strictEqual(err instanceof MRSError, true);
            assert.deepStrictEqual((err as MRSError).getClientError(), {
              code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
              message: ROLE.NO_FIELDS_TO_UPDATE_ERROR_MESSAGE,
            });

            return true;
          },
        );
      });
      await suite('Id', async () => {
        await test('Missing', (ctx) => {
          const { request } = createHttpMocks<ResponseWithCtx>({
            logger,
            reqOptions: {
              body: {
                name: randomString(),
              },
            },
          });

          const validateUpdateRoleSpy = ctx.mock.fn(
            validators.roleValidator.validateUpdateRole,
          );

          assert.throws(
            () => {
              validateUpdateRoleSpy(request);
            },
            (err) => {
              assert.strictEqual(err instanceof MRSError, true);
              assert.deepStrictEqual((err as MRSError).getClientError(), {
                code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
                message: ROLE.ID.REQUIRED_ERROR_MESSAGE,
              });

              return true;
            },
          );
        });
        await test('Empty', (ctx) => {
          const { request } = createHttpMocks<ResponseWithCtx>({
            logger,
            reqOptions: {
              params: {
                roleId: '',
              },
              body: {
                name: randomString(),
              },
            },
          });

          const validateUpdateRoleSpy = ctx.mock.fn(
            validators.roleValidator.validateUpdateRole,
          );

          assert.throws(
            () => {
              validateUpdateRoleSpy(request);
            },
            (err) => {
              assert.strictEqual(err instanceof MRSError, true);
              assert.deepStrictEqual((err as MRSError).getClientError(), {
                code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
                message: ROLE.ID.ERROR_MESSAGE,
              });

              return true;
            },
          );
        });
        await test('Invalid', (ctx) => {
          const { request } = createHttpMocks<ResponseWithCtx>({
            logger,
            reqOptions: {
              params: {
                roleId: randomString(),
              },
              body: {
                name: randomString(),
              },
            },
          });

          const validateUpdateRoleSpy = ctx.mock.fn(
            validators.roleValidator.validateUpdateRole,
          );

          assert.throws(
            () => {
              validateUpdateRoleSpy(request);
            },
            (err) => {
              assert.strictEqual(err instanceof MRSError, true);
              assert.deepStrictEqual((err as MRSError).getClientError(), {
                code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
                message: ROLE.ID.ERROR_MESSAGE,
              });

              return true;
            },
          );
        });
      });
      await suite('Name', async () => {
        await test('Empty', (ctx) => {
          const { request } = createHttpMocks<ResponseWithCtx>({
            logger,
            reqOptions: {
              params: {
                roleId: randomUUID(),
              },
              body: {
                name: '',
              },
            },
          });

          const validateUpdateRoleSpy = ctx.mock.fn(
            validators.roleValidator.validateUpdateRole,
          );

          assert.throws(
            () => {
              validateUpdateRoleSpy(request);
            },
            (err) => {
              assert.strictEqual(err instanceof MRSError, true);
              assert.deepStrictEqual((err as MRSError).getClientError(), {
                code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
                message: ROLE.NAME.MIN_LENGTH.ERROR_MESSAGE,
              });

              return true;
            },
          );
        });
        await test('Too short', (ctx) => {
          const { request } = createHttpMocks<ResponseWithCtx>({
            logger,
            reqOptions: {
              params: {
                roleId: randomUUID(),
              },
              body: {
                name: 'a'.repeat(ROLE.NAME.MIN_LENGTH.VALUE - 1),
              },
            },
          });

          const validateUpdateRoleSpy = ctx.mock.fn(
            validators.roleValidator.validateUpdateRole,
          );

          assert.throws(
            () => {
              validateUpdateRoleSpy(request);
            },
            (err) => {
              assert.strictEqual(err instanceof MRSError, true);
              assert.deepStrictEqual((err as MRSError).getClientError(), {
                code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
                message: ROLE.NAME.MIN_LENGTH.ERROR_MESSAGE,
              });

              return true;
            },
          );
        });
        await test('Too long', (ctx) => {
          const { request } = createHttpMocks<ResponseWithCtx>({
            logger,
            reqOptions: {
              params: {
                roleId: randomUUID(),
              },
              body: {
                name: 'a'.repeat(ROLE.NAME.MAX_LENGTH.VALUE + 1),
              },
            },
          });

          const validateUpdateRoleSpy = ctx.mock.fn(
            validators.roleValidator.validateUpdateRole,
          );

          assert.throws(
            () => {
              validateUpdateRoleSpy(request);
            },
            (err) => {
              assert.strictEqual(err instanceof MRSError, true);
              assert.deepStrictEqual((err as MRSError).getClientError(), {
                code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
                message: ROLE.NAME.MAX_LENGTH.ERROR_MESSAGE,
              });

              return true;
            },
          );
        });
      });
    });
    await suite('Service layer', async () => {
      await test('Duplicate', async () => {
        await createRoles(
          serverParams,
          generateRolesData(2),
          async (_, roles) => {
            const context = {
              authentication: serverParams.authentication,
              database: serverParams.database,
              logger,
            };
            const roleToUpdate = { roleId: roles[0]!.id, name: roles[1]!.name };

            await assert.rejects(
              async () => {
                await services.roleService.updateRole(context, roleToUpdate);
              },
              (err) => {
                assert.strictEqual(err instanceof MRSError, true);
                assert.deepStrictEqual((err as MRSError).getClientError(), {
                  code: HTTP_STATUS_CODES.CONFLICT,
                  message: `Role '${roles[1]!.name}' already exists`,
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
      await suite('Id', async () => {
        await test('Missing', (ctx) => {
          const { request } = createHttpMocks<ResponseWithCtx>({
            logger,
          });

          const validateDeleteRoleSpy = ctx.mock.fn(
            validators.roleValidator.validateDeleteRole,
          );

          assert.throws(
            () => {
              validateDeleteRoleSpy(request);
            },
            (err) => {
              assert.strictEqual(err instanceof MRSError, true);
              assert.deepStrictEqual((err as MRSError).getClientError(), {
                code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
                message: ROLE.ID.REQUIRED_ERROR_MESSAGE,
              });

              return true;
            },
          );
        });
        await test('Empty', (ctx) => {
          const { request } = createHttpMocks<ResponseWithCtx>({
            logger,
            reqOptions: {
              params: {
                roleId: '',
              },
            },
          });

          const validateDeleteRoleSpy = ctx.mock.fn(
            validators.roleValidator.validateDeleteRole,
          );

          assert.throws(
            () => {
              validateDeleteRoleSpy(request);
            },
            (err) => {
              assert.strictEqual(err instanceof MRSError, true);
              assert.deepStrictEqual((err as MRSError).getClientError(), {
                code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
                message: ROLE.ID.ERROR_MESSAGE,
              });

              return true;
            },
          );
        });
        await test('Invalid', (ctx) => {
          const { request } = createHttpMocks<ResponseWithCtx>({
            logger,
            reqOptions: {
              params: {
                roleId: randomString(),
              },
            },
          });

          const validateDeleteRoleSpy = ctx.mock.fn(
            validators.roleValidator.validateDeleteRole,
          );

          assert.throws(
            () => {
              validateDeleteRoleSpy(request);
            },
            (err) => {
              assert.strictEqual(err instanceof MRSError, true);
              assert.deepStrictEqual((err as MRSError).getClientError(), {
                code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
                message: ROLE.ID.ERROR_MESSAGE,
              });

              return true;
            },
          );
        });
      });
    });
  });
});
