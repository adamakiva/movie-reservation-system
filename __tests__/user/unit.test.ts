import * as service from '../../src/entities/user/service/index.js';
import * as validator from '../../src/entities/user/validator.js';

import {
  after,
  assert,
  before,
  createHttpMocks,
  HTTP_STATUS_CODES,
  initServer,
  type LoggerHandler,
  mockLogger,
  MRSError,
  randomString,
  randomUUID,
  type ResponseWithCtx,
  type ServerParams,
  suite,
  terminateServer,
  test,
  VALIDATION,
} from '../utils.js';

import { generateUsersData, seedUser, seedUsers } from './utils.js';

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

  await test('Invalid - Read single validation: Missing id', (ctx) => {
    const { request } = createHttpMocks<ResponseWithCtx>({
      logger,
    });

    const validateGetUserSpy = ctx.mock.fn(validator.validateGetUser);

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
  await test('Invalid - Read single validation: Empty id', (ctx) => {
    const { request } = createHttpMocks<ResponseWithCtx>({
      logger,
      reqOptions: {
        params: { userId: '' },
      },
    });

    const validateGetUserSpy = ctx.mock.fn(validator.validateGetUser);

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
  await test('Invalid - Read single validation: Invalid id', (ctx) => {
    const { request } = createHttpMocks<ResponseWithCtx>({
      logger,
      reqOptions: {
        params: { userId: randomString() },
      },
    });

    const validateGetUserSpy = ctx.mock.fn(validator.validateGetUser);

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
  await test('Invalid - Read single service: Non-existent entry', async (ctx) => {
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
    const getUserSpy = ctx.mock.fn(service.getUser);

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
  await test('Invalid - Read multiple validation: Empty cursor', (ctx) => {
    const { request } = createHttpMocks<ResponseWithCtx>({
      logger,
      reqOptions: {
        query: { cursor: '' },
      },
    });

    const validateGetUsersSpy = ctx.mock.fn(validator.validateGetUsers);

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
  await test('Invalid - Read multiple validation: Cursor too short', (ctx) => {
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

    const validateGetUsersSpy = ctx.mock.fn(validator.validateGetUsers);

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
  await test('Invalid - Read multiple validation: Cursor too long', (ctx) => {
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

    const validateGetUsersSpy = ctx.mock.fn(validator.validateGetUsers);

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
  await test('Invalid - Read multiple validation: Invalid cursor', (ctx) => {
    const { request } = createHttpMocks<ResponseWithCtx>({
      logger,
      reqOptions: {
        query: { cursor: Buffer.from(randomUUID()).toString('base64') },
      },
    });

    const validateGetUsersSpy = ctx.mock.fn(validator.validateGetUsers);

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
  await test('Invalid - Read multiple validation: Page size too low', (ctx) => {
    const { request } = createHttpMocks<ResponseWithCtx>({
      logger,
      reqOptions: {
        query: {
          pageSize: PAGINATION.PAGE_SIZE.MIN_LENGTH.VALUE - 1,
        },
      },
    });

    const validateGetUsersSpy = ctx.mock.fn(validator.validateGetUsers);

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
  await test('Invalid - Read multiple validation: Page size too high', (ctx) => {
    const { request } = createHttpMocks<ResponseWithCtx>({
      logger,
      reqOptions: {
        query: {
          pageSize: PAGINATION.PAGE_SIZE.MAX_LENGTH.VALUE + 1,
        },
      },
    });

    const validateGetUsersSpy = ctx.mock.fn(validator.validateGetUsers);

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
  await test('Invalid - Read multiple validation: Invalid page size', (ctx) => {
    const { request } = createHttpMocks<ResponseWithCtx>({
      logger,
      reqOptions: {
        query: { pageSize: randomString(8) },
      },
    });

    const validateGetUsersSpy = ctx.mock.fn(validator.validateGetUsers);

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
  await test('Invalid - Create validation: Missing first name', (ctx) => {
    const { request } = createHttpMocks<ResponseWithCtx>({
      logger,
      reqOptions: {
        body: {
          ...generateUsersData([randomUUID()], 1),
          firstName: undefined,
        },
      },
    });

    const validateCreateUserSpy = ctx.mock.fn(validator.validateCreateUser);

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
  await test('Invalid - Create validation: Empty first name', (ctx) => {
    const { request } = createHttpMocks<ResponseWithCtx>({
      logger,
      reqOptions: {
        body: {
          ...generateUsersData([randomUUID()], 1),
          firstName: '',
        },
      },
    });

    const validateCreateUserSpy = ctx.mock.fn(validator.validateCreateUser);

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
  await test('Invalid - Create validation: First name too short', (ctx) => {
    const { request } = createHttpMocks<ResponseWithCtx>({
      logger,
      reqOptions: {
        body: {
          ...generateUsersData([randomUUID()], 1),
          firstName: 'a'.repeat(USER.FIRST_NAME.MIN_LENGTH.VALUE - 1),
        },
      },
    });

    const validateCreateUserSpy = ctx.mock.fn(validator.validateCreateUser);

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
  await test('Invalid - Create validation: First name too long', (ctx) => {
    const { request } = createHttpMocks<ResponseWithCtx>({
      logger,
      reqOptions: {
        body: {
          ...generateUsersData([randomUUID()], 1),
          firstName: 'a'.repeat(USER.FIRST_NAME.MAX_LENGTH.VALUE + 1),
        },
      },
    });

    const validateCreateUserSpy = ctx.mock.fn(validator.validateCreateUser);

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
  await test('Invalid - Create validation: Missing last name', (ctx) => {
    const { request } = createHttpMocks<ResponseWithCtx>({
      logger,
      reqOptions: {
        body: {
          ...generateUsersData([randomUUID()], 1),
          lastName: undefined,
        },
      },
    });

    const validateCreateUserSpy = ctx.mock.fn(validator.validateCreateUser);

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
  await test('Invalid - Create validation: Empty last name', (ctx) => {
    const { request } = createHttpMocks<ResponseWithCtx>({
      logger,
      reqOptions: {
        body: {
          ...generateUsersData([randomUUID()], 1),
          lastName: '',
        },
      },
    });

    const validateCreateUserSpy = ctx.mock.fn(validator.validateCreateUser);

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
  await test('Invalid - Create validation: Last name too short', (ctx) => {
    const { request } = createHttpMocks<ResponseWithCtx>({
      logger,
      reqOptions: {
        body: {
          ...generateUsersData([randomUUID()], 1),
          lastName: 'a'.repeat(USER.LAST_NAME.MIN_LENGTH.VALUE - 1),
        },
      },
    });

    const validateCreateUserSpy = ctx.mock.fn(validator.validateCreateUser);

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
  await test('Invalid - Create validation: Last name too long', (ctx) => {
    const { request } = createHttpMocks<ResponseWithCtx>({
      logger,
      reqOptions: {
        body: {
          ...generateUsersData([randomUUID()], 1),
          lastName: 'a'.repeat(USER.LAST_NAME.MAX_LENGTH.VALUE + 1),
        },
      },
    });

    const validateCreateUserSpy = ctx.mock.fn(validator.validateCreateUser);

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
  await test('Invalid - Create validation: Missing email', (ctx) => {
    const { request } = createHttpMocks<ResponseWithCtx>({
      logger,
      reqOptions: {
        body: {
          ...generateUsersData([randomUUID()], 1),
          email: undefined,
        },
      },
    });

    const validateCreateUserSpy = ctx.mock.fn(validator.validateCreateUser);

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
  await test('Invalid - Create validation: Empty email', (ctx) => {
    const { request } = createHttpMocks<ResponseWithCtx>({
      logger,
      reqOptions: {
        body: {
          ...generateUsersData([randomUUID()], 1),
          email: '',
        },
      },
    });

    const validateCreateUserSpy = ctx.mock.fn(validator.validateCreateUser);

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
  await test('Invalid - Create validation: Email too short', (ctx) => {
    const { request } = createHttpMocks<ResponseWithCtx>({
      logger,
      reqOptions: {
        body: {
          ...generateUsersData([randomUUID()], 1),
          email: 'a'.repeat(USER.EMAIL.MIN_LENGTH.VALUE - 1),
        },
      },
    });

    const validateCreateUserSpy = ctx.mock.fn(validator.validateCreateUser);

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
  await test('Invalid - Create validation: Email too long', (ctx) => {
    const { request } = createHttpMocks<ResponseWithCtx>({
      logger,
      reqOptions: {
        body: {
          ...generateUsersData([randomUUID()], 1),
          email: `${'a'.repeat(USER.EMAIL.MAX_LENGTH.VALUE + 1)}@ph.com`,
        },
      },
    });

    const validateCreateUserSpy = ctx.mock.fn(validator.validateCreateUser);

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
  await test('Invalid - Create validation: Invalid email', (ctx) => {
    const { request } = createHttpMocks<ResponseWithCtx>({
      logger,
      reqOptions: {
        body: {
          ...generateUsersData([randomUUID()], 1),
          email: randomString(),
        },
      },
    });

    const validateCreateUserSpy = ctx.mock.fn(validator.validateCreateUser);

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
  await test('Invalid - Create validation: Missing password', (ctx) => {
    const { request } = createHttpMocks<ResponseWithCtx>({
      logger,
      reqOptions: {
        body: {
          ...generateUsersData([randomUUID()], 1),
          password: undefined,
        },
      },
    });

    const validateCreateUserSpy = ctx.mock.fn(validator.validateCreateUser);

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
  await test('Invalid - Create validation: Empty password', (ctx) => {
    const { request } = createHttpMocks<ResponseWithCtx>({
      logger,
      reqOptions: {
        body: {
          ...generateUsersData([randomUUID()], 1),
          password: '',
        },
      },
    });

    const validateCreateUserSpy = ctx.mock.fn(validator.validateCreateUser);

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
  await test('Invalid - Create validation: Password too short', (ctx) => {
    const { request } = createHttpMocks<ResponseWithCtx>({
      logger,
      reqOptions: {
        body: {
          ...generateUsersData([randomUUID()], 1),
          password: 'a'.repeat(USER.PASSWORD.MIN_LENGTH.VALUE - 1),
        },
      },
    });

    const validateCreateUserSpy = ctx.mock.fn(validator.validateCreateUser);

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
  await test('Invalid - Create validation: Password too long', (ctx) => {
    const { request } = createHttpMocks<ResponseWithCtx>({
      logger,
      reqOptions: {
        body: {
          ...generateUsersData([randomUUID()], 1),
          password: 'a'.repeat(USER.PASSWORD.MAX_LENGTH.VALUE + 1),
        },
      },
    });

    const validateCreateUserSpy = ctx.mock.fn(validator.validateCreateUser);

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
  await test('Invalid - Create validation: Missing role id', (ctx) => {
    const { request } = createHttpMocks<ResponseWithCtx>({
      logger,
      reqOptions: {
        body: {
          ...generateUsersData([randomUUID()], 1),
          roleId: undefined,
        },
      },
    });

    const validateCreateUserSpy = ctx.mock.fn(validator.validateCreateUser);

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
  await test('Invalid - Create validation: Empty role id', (ctx) => {
    const { request } = createHttpMocks<ResponseWithCtx>({
      logger,
      reqOptions: {
        body: {
          ...generateUsersData([randomUUID()], 1),
          roleId: '',
        },
      },
    });

    const validateCreateUserSpy = ctx.mock.fn(validator.validateCreateUser);

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
  await test('Invalid - Create validation: Invalid role id', (ctx) => {
    const { request } = createHttpMocks<ResponseWithCtx>({
      logger,
      reqOptions: {
        body: {
          ...generateUsersData([randomUUID()], 1),
          roleId: randomString(),
        },
      },
    });

    const validateCreateUserSpy = ctx.mock.fn(validator.validateCreateUser);

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
  await test('Invalid - Create service: Duplicate entry', async () => {
    await seedUser(serverParams, true, async (user, role) => {
      await assert.rejects(
        async () => {
          await service.createUser(
            {
              authentication: serverParams.authentication,
              database: serverParams.database,
              logger,
            },
            {
              ...generateUsersData([role.id], 1),
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
    });
  });
  await test('Invalid - Create service: Non-existent role id', async () => {
    const roleId = randomUUID();

    await assert.rejects(
      async () => {
        await service.createUser(
          {
            authentication: serverParams.authentication,
            database: serverParams.database,
            logger,
          },
          generateUsersData([roleId], 1),
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
  await test('Invalid - Update validation - Without updates', (ctx) => {
    const { request } = createHttpMocks<ResponseWithCtx>({
      logger,
      reqOptions: {
        params: { userId: randomUUID() },
      },
    });

    const validateUpdateUserSpy = ctx.mock.fn(validator.validateUpdateUser);

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
  await test('Invalid - Update validation: Missing id', (ctx) => {
    const { request } = createHttpMocks<ResponseWithCtx>({
      logger,
      reqOptions: { body: { roleId: randomUUID() } },
    });

    const validateUpdateUserSpy = ctx.mock.fn(validator.validateUpdateUser);

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
  await test('Invalid - Update validation: Empty id', (ctx) => {
    const { request } = createHttpMocks<ResponseWithCtx>({
      logger,
      reqOptions: {
        params: { userId: '' },
        body: { roleId: randomUUID() },
      },
    });

    const validateUpdateUserSpy = ctx.mock.fn(validator.validateUpdateUser);

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
  await test('Invalid - Update validation: Invalid id', (ctx) => {
    const { request } = createHttpMocks<ResponseWithCtx>({
      logger,
      reqOptions: {
        params: { userId: randomString() },
        body: { roleId: randomUUID() },
      },
    });

    const validateUpdateUserSpy = ctx.mock.fn(validator.validateUpdateUser);

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
  await test('Invalid - Update validation: Empty first name', (ctx) => {
    const { request } = createHttpMocks<ResponseWithCtx>({
      logger,
      reqOptions: {
        params: { userId: randomUUID() },
        body: { firstName: '', roleId: randomUUID() },
      },
    });

    const validateUpdateUserSpy = ctx.mock.fn(validator.validateUpdateUser);

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
  await test('Invalid - Update validation: First name too short', (ctx) => {
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

    const validateUpdateUserSpy = ctx.mock.fn(validator.validateUpdateUser);

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
  await test('Invalid - Update validation: First name too long', (ctx) => {
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

    const validateUpdateUserSpy = ctx.mock.fn(validator.validateUpdateUser);

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
  await test('Invalid - Update validation: Empty last name', (ctx) => {
    const { request } = createHttpMocks<ResponseWithCtx>({
      logger,
      reqOptions: {
        params: { userId: randomUUID() },
        body: { lastName: '', roleId: randomUUID() },
      },
    });

    const validateUpdateUserSpy = ctx.mock.fn(validator.validateUpdateUser);

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
  await test('Invalid - Update validation: Last name too short', (ctx) => {
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

    const validateUpdateUserSpy = ctx.mock.fn(validator.validateUpdateUser);

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
  await test('Invalid - Update validation: Last name too long', (ctx) => {
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

    const validateUpdateUserSpy = ctx.mock.fn(validator.validateUpdateUser);

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
  await test('Invalid - Update validation: Empty email', (ctx) => {
    const { request } = createHttpMocks<ResponseWithCtx>({
      logger,
      reqOptions: {
        params: { userId: randomUUID() },
        body: { email: '', roleId: randomUUID() },
      },
    });

    const validateUpdateUserSpy = ctx.mock.fn(validator.validateUpdateUser);

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
  await test('Invalid - Update validation: Email too short', (ctx) => {
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

    const validateUpdateUserSpy = ctx.mock.fn(validator.validateUpdateUser);

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
  await test('Invalid - Update validation: Email too long', (ctx) => {
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

    const validateUpdateUserSpy = ctx.mock.fn(validator.validateUpdateUser);

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
  await test('Invalid - Update validation: Invalid email', (ctx) => {
    const { request } = createHttpMocks<ResponseWithCtx>({
      logger,
      reqOptions: {
        params: { userId: randomUUID() },
        body: { email: randomString(32), roleId: randomUUID() },
      },
    });

    const validateUpdateUserSpy = ctx.mock.fn(validator.validateUpdateUser);

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
  await test('Invalid - Update validation: Empty password', (ctx) => {
    const { request } = createHttpMocks<ResponseWithCtx>({
      logger,
      reqOptions: {
        params: { userId: randomUUID() },
        body: { password: '', roleId: randomUUID() },
      },
    });

    const validateUpdateUserSpy = ctx.mock.fn(validator.validateUpdateUser);

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
  await test('Invalid - Update validation: Password too short', (ctx) => {
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

    const validateUpdateUserSpy = ctx.mock.fn(validator.validateUpdateUser);

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
  await test('Invalid - Update validation: Password too long', (ctx) => {
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

    const validateUpdateUserSpy = ctx.mock.fn(validator.validateUpdateUser);

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
  await test('Invalid - Update validation: Empty role id', (ctx) => {
    const { request } = createHttpMocks<ResponseWithCtx>({
      logger,
      reqOptions: {
        params: { userId: randomUUID() },
        body: { firstName: randomString(), roleId: '' },
      },
    });

    const validateUpdateUserSpy = ctx.mock.fn(validator.validateUpdateUser);

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
  await test('Invalid - Update validation: Invalid role id', (ctx) => {
    const { request } = createHttpMocks<ResponseWithCtx>({
      logger,
      reqOptions: {
        params: { userId: randomUUID() },
        body: { firstName: randomString(), roleId: randomString() },
      },
    });

    const validateUpdateUserSpy = ctx.mock.fn(validator.validateUpdateUser);

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
  await test('Invalid - Update service: Non-existent user', async () => {
    const userId = randomUUID();

    await assert.rejects(
      async () => {
        await service.updateUser(
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
  await test('Invalid - Update service: Duplicate entry', async () => {
    await seedUsers(serverParams, 2, false, async (users) => {
      await assert.rejects(
        async () => {
          await service.updateUser(
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
    });
  });
  await test('Invalid - Update service: Non-existent role id', async () => {
    const updatedRoleId = randomUUID();

    await seedUser(serverParams, true, async (user) => {
      await assert.rejects(
        async () => {
          await service.updateUser(
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
    });
  });
  await test('Invalid - Delete validation: Missing id', (ctx) => {
    const { request } = createHttpMocks<ResponseWithCtx>({
      logger,
    });

    const validateDeleteUserSpy = ctx.mock.fn(validator.validateDeleteUser);

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
  await test('Invalid - Delete validation: Empty id', (ctx) => {
    const { request } = createHttpMocks<ResponseWithCtx>({
      logger,
      reqOptions: { params: { userId: '' } },
    });

    const validateDeleteUserSpy = ctx.mock.fn(validator.validateDeleteUser);

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
  await test('Invalid - Delete validation: Invalid id', (ctx) => {
    const { request } = createHttpMocks<ResponseWithCtx>({
      logger,
      reqOptions: { params: { userId: randomString() } },
    });

    const validateDeleteUserSpy = ctx.mock.fn(validator.validateDeleteUser);

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
