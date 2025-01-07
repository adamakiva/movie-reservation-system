import { deleteRoles } from '../role/utils.js';
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
  type ResponseWithContext,
  type ServerParams,
  suite,
  terminateServer,
  test,
  VALIDATION,
} from '../utils.js';

import {
  deleteUsers,
  generateRandomUserData,
  seedUser,
  seedUsers,
  serviceFunctions,
  validationFunctions,
} from './utils.js';

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

  await test('Invalid - Read single validation: Missing id', (context) => {
    const { request } = createHttpMocks<ResponseWithContext>({
      logger,
    });

    const validateGetUserSpy = context.mock.fn(
      validationFunctions.validateGetUser,
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
  await test('Invalid - Read single validation: Empty id', (context) => {
    const { request } = createHttpMocks<ResponseWithContext>({
      logger,
      reqOptions: {
        params: { user_id: '' },
      },
    });

    const validateGetUserSpy = context.mock.fn(
      validationFunctions.validateGetUser,
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
  await test('Invalid - Read single validation: Invalid id', (context) => {
    const { request } = createHttpMocks<ResponseWithContext>({
      logger,
      reqOptions: {
        params: { user_id: randomString() },
      },
    });

    const validateGetUserSpy = context.mock.fn(
      validationFunctions.validateGetUser,
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
  await test('Invalid - Read single service: Non-existent entry', async (context) => {
    const { authentication, fileManager, database } = serverParams;
    context.mock.method(database, 'getHandler', () => {
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
    const getUserSpy = context.mock.fn(serviceFunctions.getUser);

    await assert.rejects(
      async () => {
        await getUserSpy(
          {
            authentication,
            fileManager,
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
  await test('Invalid - Read multiple validation: Empty cursor', (context) => {
    const { request } = createHttpMocks<ResponseWithContext>({
      logger,
      reqOptions: {
        query: { cursor: '' },
      },
    });

    const validateGetUsersSpy = context.mock.fn(
      validationFunctions.validateGetUsers,
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
  await test('Invalid - Read multiple validation: Cursor too short', (context) => {
    const { request } = createHttpMocks<ResponseWithContext>({
      logger,
      reqOptions: {
        query: {
          cursor: Buffer.from(
            randomString(PAGINATION.CURSOR.MIN_LENGTH.VALUE - 1),
          ).toString('base64'),
        },
      },
    });

    const validateGetUsersSpy = context.mock.fn(
      validationFunctions.validateGetUsers,
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
  await test('Invalid - Read multiple validation: Cursor too long', (context) => {
    const { request } = createHttpMocks<ResponseWithContext>({
      logger,
      reqOptions: {
        query: {
          cursor: Buffer.from(
            randomString(PAGINATION.CURSOR.MAX_LENGTH.VALUE + 1),
          ).toString('base64'),
        },
      },
    });

    const validateGetUsersSpy = context.mock.fn(
      validationFunctions.validateGetUsers,
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
  await test('Invalid - Read multiple validation: Invalid cursor', (context) => {
    const { request } = createHttpMocks<ResponseWithContext>({
      logger,
      reqOptions: {
        query: { cursor: Buffer.from(randomUUID()).toString('base64') },
      },
    });

    const validateGetUsersSpy = context.mock.fn(
      validationFunctions.validateGetUsers,
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
  await test('Invalid - Read multiple validation: Page size too low', (context) => {
    const { request } = createHttpMocks<ResponseWithContext>({
      logger,
      reqOptions: {
        query: {
          'page-size': PAGINATION.PAGE_SIZE.MIN_LENGTH.VALUE - 1,
        },
      },
    });

    const validateGetUsersSpy = context.mock.fn(
      validationFunctions.validateGetUsers,
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
  await test('Invalid - Read multiple validation: Page size too high', (context) => {
    const { request } = createHttpMocks<ResponseWithContext>({
      logger,
      reqOptions: {
        query: {
          'page-size': PAGINATION.PAGE_SIZE.MAX_LENGTH.VALUE + 1,
        },
      },
    });

    const validateGetUsersSpy = context.mock.fn(
      validationFunctions.validateGetUsers,
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
  await test('Invalid - Read multiple validation: Invalid page size', (context) => {
    const { request } = createHttpMocks<ResponseWithContext>({
      logger,
      reqOptions: {
        query: { 'page-size': randomString() },
      },
    });

    const validateGetUsersSpy = context.mock.fn(
      validationFunctions.validateGetUsers,
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
  await test('Invalid - Create validation: Missing first name', (context) => {
    const { request } = createHttpMocks<ResponseWithContext>({
      logger,
      reqOptions: {
        body: {
          ...generateRandomUserData(),
          firstName: undefined,
        },
      },
    });

    const validateCreateUserSpy = context.mock.fn(
      validationFunctions.validateCreateUser,
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
  await test('Invalid - Create validation: Empty first name', (context) => {
    const { request } = createHttpMocks<ResponseWithContext>({
      logger,
      reqOptions: {
        body: {
          ...generateRandomUserData(),
          firstName: '',
        },
      },
    });

    const validateCreateUserSpy = context.mock.fn(
      validationFunctions.validateCreateUser,
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
  await test('Invalid - Create validation: First name too short', (context) => {
    const { request } = createHttpMocks<ResponseWithContext>({
      logger,
      reqOptions: {
        body: {
          ...generateRandomUserData(),
          firstName: randomString(USER.FIRST_NAME.MIN_LENGTH.VALUE - 1),
        },
      },
    });

    const validateCreateUserSpy = context.mock.fn(
      validationFunctions.validateCreateUser,
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
  await test('Invalid - Create validation: First name too long', (context) => {
    const { request } = createHttpMocks<ResponseWithContext>({
      logger,
      reqOptions: {
        body: {
          ...generateRandomUserData(),
          firstName: randomString(USER.FIRST_NAME.MAX_LENGTH.VALUE + 1),
        },
      },
    });

    const validateCreateUserSpy = context.mock.fn(
      validationFunctions.validateCreateUser,
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
  await test('Invalid - Create validation: Missing last name', (context) => {
    const { request } = createHttpMocks<ResponseWithContext>({
      logger,
      reqOptions: {
        body: {
          ...generateRandomUserData(),
          lastName: undefined,
        },
      },
    });

    const validateCreateUserSpy = context.mock.fn(
      validationFunctions.validateCreateUser,
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
  await test('Invalid - Create validation: Empty last name', (context) => {
    const { request } = createHttpMocks<ResponseWithContext>({
      logger,
      reqOptions: {
        body: {
          ...generateRandomUserData(),
          lastName: '',
        },
      },
    });

    const validateCreateUserSpy = context.mock.fn(
      validationFunctions.validateCreateUser,
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
  await test('Invalid - Create validation: Last name too short', (context) => {
    const { request } = createHttpMocks<ResponseWithContext>({
      logger,
      reqOptions: {
        body: {
          ...generateRandomUserData(),
          lastName: randomString(USER.LAST_NAME.MIN_LENGTH.VALUE - 1),
        },
      },
    });

    const validateCreateUserSpy = context.mock.fn(
      validationFunctions.validateCreateUser,
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
  await test('Invalid - Create validation: Last name too long', (context) => {
    const { request } = createHttpMocks<ResponseWithContext>({
      logger,
      reqOptions: {
        body: {
          ...generateRandomUserData(),
          lastName: randomString(USER.LAST_NAME.MAX_LENGTH.VALUE + 1),
        },
      },
    });

    const validateCreateUserSpy = context.mock.fn(
      validationFunctions.validateCreateUser,
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
  await test('Invalid - Create validation: Missing email', (context) => {
    const { request } = createHttpMocks<ResponseWithContext>({
      logger,
      reqOptions: {
        body: {
          ...generateRandomUserData(),
          email: undefined,
        },
      },
    });

    const validateCreateUserSpy = context.mock.fn(
      validationFunctions.validateCreateUser,
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
  await test('Invalid - Create validation: Empty email', (context) => {
    const { request } = createHttpMocks<ResponseWithContext>({
      logger,
      reqOptions: {
        body: {
          ...generateRandomUserData(),
          email: '',
        },
      },
    });

    const validateCreateUserSpy = context.mock.fn(
      validationFunctions.validateCreateUser,
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
  await test('Invalid - Create validation: Email too short', (context) => {
    const { request } = createHttpMocks<ResponseWithContext>({
      logger,
      reqOptions: {
        body: {
          ...generateRandomUserData(),
          email: randomString(USER.EMAIL.MIN_LENGTH.VALUE - 1),
        },
      },
    });

    const validateCreateUserSpy = context.mock.fn(
      validationFunctions.validateCreateUser,
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
  await test('Invalid - Create validation: Email too long', (context) => {
    const { request } = createHttpMocks<ResponseWithContext>({
      logger,
      reqOptions: {
        body: {
          ...generateRandomUserData(),
          email: `${randomString(USER.EMAIL.MAX_LENGTH.VALUE + 1)}@ph.com`,
        },
      },
    });

    const validateCreateUserSpy = context.mock.fn(
      validationFunctions.validateCreateUser,
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
  await test('Invalid - Create validation: Invalid email', (context) => {
    const { request } = createHttpMocks<ResponseWithContext>({
      logger,
      reqOptions: {
        body: {
          ...generateRandomUserData(),
          email: randomString(),
        },
      },
    });

    const validateCreateUserSpy = context.mock.fn(
      validationFunctions.validateCreateUser,
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
  await test('Invalid - Create validation: Missing password', (context) => {
    const { request } = createHttpMocks<ResponseWithContext>({
      logger,
      reqOptions: {
        body: {
          ...generateRandomUserData(),
          password: undefined,
        },
      },
    });

    const validateCreateUserSpy = context.mock.fn(
      validationFunctions.validateCreateUser,
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
  await test('Invalid - Create validation: Empty password', (context) => {
    const { request } = createHttpMocks<ResponseWithContext>({
      logger,
      reqOptions: {
        body: {
          ...generateRandomUserData(),
          password: '',
        },
      },
    });

    const validateCreateUserSpy = context.mock.fn(
      validationFunctions.validateCreateUser,
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
  await test('Invalid - Create validation: Password too short', (context) => {
    const { request } = createHttpMocks<ResponseWithContext>({
      logger,
      reqOptions: {
        body: {
          ...generateRandomUserData(),
          password: randomString(USER.PASSWORD.MIN_LENGTH.VALUE - 1),
        },
      },
    });

    const validateCreateUserSpy = context.mock.fn(
      validationFunctions.validateCreateUser,
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
  await test('Invalid - Create validation: Password too long', (context) => {
    const { request } = createHttpMocks<ResponseWithContext>({
      logger,
      reqOptions: {
        body: {
          ...generateRandomUserData(),
          password: randomString(USER.PASSWORD.MAX_LENGTH.VALUE + 1),
        },
      },
    });

    const validateCreateUserSpy = context.mock.fn(
      validationFunctions.validateCreateUser,
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
  await test('Invalid - Create validation: Missing role id', (context) => {
    const { request } = createHttpMocks<ResponseWithContext>({
      logger,
      reqOptions: {
        body: {
          ...generateRandomUserData(),
          roleId: undefined,
        },
      },
    });

    const validateCreateUserSpy = context.mock.fn(
      validationFunctions.validateCreateUser,
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
  await test('Invalid - Create validation: Empty role id', (context) => {
    const { request } = createHttpMocks<ResponseWithContext>({
      logger,
      reqOptions: {
        body: {
          ...generateRandomUserData(),
          roleId: '',
        },
      },
    });

    const validateCreateUserSpy = context.mock.fn(
      validationFunctions.validateCreateUser,
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
  await test('Invalid - Create validation: Invalid role id', (context) => {
    const { request } = createHttpMocks<ResponseWithContext>({
      logger,
      reqOptions: {
        body: {
          ...generateRandomUserData(),
          roleId: randomString(),
        },
      },
    });

    const validateCreateUserSpy = context.mock.fn(
      validationFunctions.validateCreateUser,
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
  await test('Invalid - Create service: Duplicate entry', async () => {
    const { createdUser, createdRole, ids } = await seedUser(
      serverParams,
      true,
    );

    try {
      await assert.rejects(
        async () => {
          // In case the function does not throw, we want to clean the created entry
          const shouldNotOccur = await serviceFunctions.createUser(
            {
              authentication: serverParams.authentication,
              fileManager: serverParams.fileManager,
              database: serverParams.database,
              logger,
            },
            {
              ...generateRandomUserData(createdRole.id),
              email: createdUser.email,
            },
          );
          ids.user.push(shouldNotOccur.id);
        },
        (err) => {
          assert.strictEqual(err instanceof MRSError, true);
          assert.deepStrictEqual((err as MRSError).getClientError(), {
            code: HTTP_STATUS_CODES.CONFLICT,
            message: `User '${createdUser.email}' already exists`,
          });

          return true;
        },
      );
    } finally {
      await deleteUsers(serverParams, ...ids.user);
      await deleteRoles(serverParams, ...ids.role);
    }
  });
  await test('Invalid - Create service: Non-existent role id', async () => {
    const roleId = randomUUID();

    await assert.rejects(
      async () => {
        await serviceFunctions.createUser(
          {
            authentication: serverParams.authentication,
            fileManager: serverParams.fileManager,
            database: serverParams.database,
            logger,
          },
          generateRandomUserData(roleId),
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
  await test('Invalid - Update validation: Without updates', (context) => {
    const { request } = createHttpMocks<ResponseWithContext>({
      logger,
      reqOptions: {
        params: { user_id: randomUUID() },
      },
    });

    const validateUpdateUserSpy = context.mock.fn(
      validationFunctions.validateUpdateUser,
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
  await test('Invalid - Update validation: Missing id', (context) => {
    const { request } = createHttpMocks<ResponseWithContext>({
      logger,
      reqOptions: { body: { roleId: randomUUID() } },
    });

    const validateUpdateUserSpy = context.mock.fn(
      validationFunctions.validateUpdateUser,
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
  await test('Invalid - Update validation: Empty id', (context) => {
    const { request } = createHttpMocks<ResponseWithContext>({
      logger,
      reqOptions: {
        params: { user_id: '' },
        body: { roleId: randomUUID() },
      },
    });

    const validateUpdateUserSpy = context.mock.fn(
      validationFunctions.validateUpdateUser,
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
  await test('Invalid - Update validation: Invalid id', (context) => {
    const { request } = createHttpMocks<ResponseWithContext>({
      logger,
      reqOptions: {
        params: { user_id: randomString() },
        body: { roleId: randomUUID() },
      },
    });

    const validateUpdateUserSpy = context.mock.fn(
      validationFunctions.validateUpdateUser,
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
  await test('Invalid - Update validation: Empty first name', (context) => {
    const { request } = createHttpMocks<ResponseWithContext>({
      logger,
      reqOptions: {
        params: { user_id: randomUUID() },
        body: { firstName: '', roleId: randomUUID() },
      },
    });

    const validateUpdateUserSpy = context.mock.fn(
      validationFunctions.validateUpdateUser,
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
  await test('Invalid - Update validation: First name too short', (context) => {
    const { request } = createHttpMocks<ResponseWithContext>({
      logger,
      reqOptions: {
        params: { user_id: randomUUID() },
        body: {
          firstName: randomString(USER.FIRST_NAME.MIN_LENGTH.VALUE - 1),
          roleId: randomUUID(),
        },
      },
    });

    const validateUpdateUserSpy = context.mock.fn(
      validationFunctions.validateUpdateUser,
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
  await test('Invalid - Update validation: First name too long', (context) => {
    const { request } = createHttpMocks<ResponseWithContext>({
      logger,
      reqOptions: {
        params: { user_id: randomUUID() },
        body: {
          firstName: randomString(USER.FIRST_NAME.MAX_LENGTH.VALUE + 1),
          roleId: randomUUID(),
        },
      },
    });

    const validateUpdateUserSpy = context.mock.fn(
      validationFunctions.validateUpdateUser,
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
  await test('Invalid - Update validation: Empty last name', (context) => {
    const { request } = createHttpMocks<ResponseWithContext>({
      logger,
      reqOptions: {
        params: { user_id: randomUUID() },
        body: { lastName: '', roleId: randomUUID() },
      },
    });

    const validateUpdateUserSpy = context.mock.fn(
      validationFunctions.validateUpdateUser,
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
  await test('Invalid - Update validation: Last name too short', (context) => {
    const { request } = createHttpMocks<ResponseWithContext>({
      logger,
      reqOptions: {
        params: { user_id: randomUUID() },
        body: {
          lastName: randomString(USER.LAST_NAME.MIN_LENGTH.VALUE - 1),
          roleId: randomUUID(),
        },
      },
    });

    const validateUpdateUserSpy = context.mock.fn(
      validationFunctions.validateUpdateUser,
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
  await test('Invalid - Update validation: Last name too long', (context) => {
    const { request } = createHttpMocks<ResponseWithContext>({
      logger,
      reqOptions: {
        params: { user_id: randomUUID() },
        body: {
          lastName: randomString(USER.LAST_NAME.MAX_LENGTH.VALUE + 1),
          roleId: randomUUID(),
        },
      },
    });

    const validateUpdateUserSpy = context.mock.fn(
      validationFunctions.validateUpdateUser,
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
  await test('Invalid - Update validation: Empty email', (context) => {
    const { request } = createHttpMocks<ResponseWithContext>({
      logger,
      reqOptions: {
        params: { user_id: randomUUID() },
        body: { email: '', roleId: randomUUID() },
      },
    });

    const validateUpdateUserSpy = context.mock.fn(
      validationFunctions.validateUpdateUser,
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
  await test('Invalid - Update validation: Email too short', (context) => {
    const { request } = createHttpMocks<ResponseWithContext>({
      logger,
      reqOptions: {
        params: { user_id: randomUUID() },
        body: {
          email: randomString(USER.EMAIL.MIN_LENGTH.VALUE - 1),
          roleId: randomUUID(),
        },
      },
    });

    const validateUpdateUserSpy = context.mock.fn(
      validationFunctions.validateUpdateUser,
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
  await test('Invalid - Update validation: Email too long', (context) => {
    const { request } = createHttpMocks<ResponseWithContext>({
      logger,
      reqOptions: {
        params: { user_id: randomUUID() },
        body: {
          email: `${randomString(USER.EMAIL.MAX_LENGTH.VALUE + 1)}@ph.com`,
          roleId: randomUUID(),
        },
      },
    });

    const validateUpdateUserSpy = context.mock.fn(
      validationFunctions.validateUpdateUser,
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
  await test('Invalid - Update validation: Invalid email', (context) => {
    const { request } = createHttpMocks<ResponseWithContext>({
      logger,
      reqOptions: {
        params: { user_id: randomUUID() },
        body: { email: randomString(32), roleId: randomUUID() },
      },
    });

    const validateUpdateUserSpy = context.mock.fn(
      validationFunctions.validateUpdateUser,
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
  await test('Invalid - Update validation: Empty password', (context) => {
    const { request } = createHttpMocks<ResponseWithContext>({
      logger,
      reqOptions: {
        params: { user_id: randomUUID() },
        body: { password: '', roleId: randomUUID() },
      },
    });

    const validateUpdateUserSpy = context.mock.fn(
      validationFunctions.validateUpdateUser,
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
  await test('Invalid - Update validation: Password too short', (context) => {
    const { request } = createHttpMocks<ResponseWithContext>({
      logger,
      reqOptions: {
        params: { user_id: randomUUID() },
        body: {
          password: randomString(USER.PASSWORD.MIN_LENGTH.VALUE - 1),
          roleId: randomUUID(),
        },
      },
    });

    const validateUpdateUserSpy = context.mock.fn(
      validationFunctions.validateUpdateUser,
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
  await test('Invalid - Update validation: Password too long', (context) => {
    const { request } = createHttpMocks<ResponseWithContext>({
      logger,
      reqOptions: {
        params: { user_id: randomUUID() },
        body: {
          password: randomString(USER.PASSWORD.MAX_LENGTH.VALUE + 1),
          roleId: randomUUID(),
        },
      },
    });

    const validateUpdateUserSpy = context.mock.fn(
      validationFunctions.validateUpdateUser,
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
  await test('Invalid - Update validation: Empty role id', (context) => {
    const { request } = createHttpMocks<ResponseWithContext>({
      logger,
      reqOptions: {
        params: { user_id: randomUUID() },
        body: { firstName: randomString(), roleId: '' },
      },
    });

    const validateUpdateUserSpy = context.mock.fn(
      validationFunctions.validateUpdateUser,
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
  await test('Invalid - Update validation: Invalid role id', (context) => {
    const { request } = createHttpMocks<ResponseWithContext>({
      logger,
      reqOptions: {
        params: { user_id: randomUUID() },
        body: {
          firstName: randomString(USER.FIRST_NAME.MIN_LENGTH.VALUE + 1),
          roleId: randomString(),
        },
      },
    });

    const validateUpdateUserSpy = context.mock.fn(
      validationFunctions.validateUpdateUser,
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
  await test('Invalid - Update service: Non-existent user', async () => {
    const userId = randomUUID();

    await assert.rejects(
      async () => {
        await serviceFunctions.updateUser(
          {
            authentication: serverParams.authentication,
            fileManager: serverParams.fileManager,
            database: serverParams.database,
            logger,
          },
          {
            userId,
            firstName: randomString(USER.FIRST_NAME.MIN_LENGTH.VALUE + 1),
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
    const { createdUsers, ids } = await seedUsers(serverParams, 2);

    try {
      await assert.rejects(
        async () => {
          await serviceFunctions.updateUser(
            {
              authentication: serverParams.authentication,
              fileManager: serverParams.fileManager,
              database: serverParams.database,
              logger,
            },
            {
              userId: createdUsers[0]!.id,
              email: createdUsers[1]!.email,
            },
          );
        },
        (err) => {
          assert.strictEqual(err instanceof MRSError, true);
          assert.deepStrictEqual((err as MRSError).getClientError(), {
            code: HTTP_STATUS_CODES.CONFLICT,
            message: `User '${createdUsers[1]!.email}' already exists`,
          });

          return true;
        },
      );
    } finally {
      await deleteUsers(serverParams, ...ids.user);
      await deleteRoles(serverParams, ...ids.role);
    }
  });
  await test('Invalid - Update service: Non-existent role id', async () => {
    const updatedRoleId = randomUUID();

    const { createdUser, ids } = await seedUser(serverParams, true);

    try {
      await assert.rejects(
        async () => {
          await serviceFunctions.updateUser(
            {
              authentication: serverParams.authentication,
              fileManager: serverParams.fileManager,
              database: serverParams.database,
              logger,
            },
            {
              userId: createdUser.id,
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
    } finally {
      await deleteUsers(serverParams, ...ids.user);
      await deleteRoles(serverParams, ...ids.role);
    }
  });
  await test('Invalid - Delete validation: Missing id', (context) => {
    const { request } = createHttpMocks<ResponseWithContext>({
      logger,
    });

    const validateDeleteUserSpy = context.mock.fn(
      validationFunctions.validateDeleteUser,
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
  await test('Invalid - Delete validation: Empty id', (context) => {
    const { request } = createHttpMocks<ResponseWithContext>({
      logger,
      reqOptions: { params: { user_id: '' } },
    });

    const validateDeleteUserSpy = context.mock.fn(
      validationFunctions.validateDeleteUser,
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
  await test('Invalid - Delete validation: Invalid id', (context) => {
    const { request } = createHttpMocks<ResponseWithContext>({
      logger,
      reqOptions: { params: { user_id: randomString() } },
    });

    const validateDeleteUserSpy = context.mock.fn(
      validationFunctions.validateDeleteUser,
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
