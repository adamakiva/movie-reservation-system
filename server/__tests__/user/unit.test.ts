import {
  after,
  assert,
  before,
  clearDatabase,
  createHttpMocks,
  GeneralError,
  HTTP_STATUS_CODES,
  initServer,
  mockLogger,
  randomAlphaNumericString,
  randomUUID,
  suite,
  terminateServer,
  test,
  VALIDATION,
  type Logger,
  type ResponseWithContext,
  type ServerParams,
} from '../utils.ts';

import {
  generateRandomUserData,
  seedUser,
  seedUsers,
  serviceFunctions,
  USER,
  validationFunctions,
} from './utils.ts';

/**********************************************************************************/

const { PAGINATION } = VALIDATION;

/**********************************************************************************/

await suite('User unit tests', async () => {
  let logger: Logger = null!;
  let serverParams: ServerParams = null!;
  before(async () => {
    logger = mockLogger();
    serverParams = await initServer();
  });
  after(() => {
    terminateServer(serverParams);
  });

  await test('Invalid - Read single validation: Missing id', (context) => {
    const { request, response } = createHttpMocks<ResponseWithContext>({
      logger,
    });

    const validateGetUserSpy = context.mock.fn(
      validationFunctions.validateGetUser,
    );

    assert.throws(
      () => {
        validateGetUserSpy(request);
      },
      (err: GeneralError) => {
        assert.strictEqual(err instanceof GeneralError, true);
        assert.deepStrictEqual(err.getClientError(response), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: USER.ID.REQUIRED_ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Read single validation: Empty id', (context) => {
    const { request, response } = createHttpMocks<ResponseWithContext>({
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
      (err: GeneralError) => {
        assert.strictEqual(err instanceof GeneralError, true);
        assert.deepStrictEqual(err.getClientError(response), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: USER.ID.ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Read single validation: Invalid id', (context) => {
    const { request, response } = createHttpMocks<ResponseWithContext>({
      logger,
      reqOptions: {
        params: { user_id: randomAlphaNumericString() },
      },
    });

    const validateGetUserSpy = context.mock.fn(
      validationFunctions.validateGetUser,
    );

    assert.throws(
      () => {
        validateGetUserSpy(request);
      },
      (err: GeneralError) => {
        assert.strictEqual(err instanceof GeneralError, true);
        assert.deepStrictEqual(err.getClientError(response), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: USER.ID.ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Read single service: Non-existent entry', async (context) => {
    const { authentication, fileManager, database, messageQueue } =
      serverParams;
    const { response } = createHttpMocks<ResponseWithContext>({ logger });

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
            messageQueue,
            logger,
          },
          randomUUID(),
        );
      },
      (err: GeneralError) => {
        assert.strictEqual(err instanceof GeneralError, true);
        assert.strictEqual(
          err.getClientError(response).code,
          HTTP_STATUS_CODES.NOT_FOUND,
        );
        return true;
      },
    );
  });
  await test('Invalid - Read multiple validation: Empty cursor', (context) => {
    const { request, response } = createHttpMocks<ResponseWithContext>({
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
      (err: GeneralError) => {
        assert.strictEqual(err instanceof GeneralError, true);
        assert.deepStrictEqual(err.getClientError(response), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: PAGINATION.CURSOR.MIN_LENGTH.ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Read multiple validation: Cursor too short', (context) => {
    const { request, response } = createHttpMocks<ResponseWithContext>({
      logger,
      reqOptions: {
        query: {
          cursor: Buffer.from(
            randomAlphaNumericString(PAGINATION.CURSOR.MIN_LENGTH.VALUE - 1),
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
      (err: GeneralError) => {
        assert.strictEqual(err instanceof GeneralError, true);
        assert.deepStrictEqual(err.getClientError(response), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: PAGINATION.CURSOR.MIN_LENGTH.ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Read multiple validation: Cursor too long', (context) => {
    const { request, response } = createHttpMocks<ResponseWithContext>({
      logger,
      reqOptions: {
        query: {
          cursor: Buffer.from(
            randomAlphaNumericString(PAGINATION.CURSOR.MAX_LENGTH.VALUE + 1),
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
      (err: GeneralError) => {
        assert.strictEqual(err instanceof GeneralError, true);
        assert.deepStrictEqual(err.getClientError(response), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: PAGINATION.CURSOR.MAX_LENGTH.ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Read multiple validation: Invalid cursor', (context) => {
    const { request, response } = createHttpMocks<ResponseWithContext>({
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
      (err: GeneralError) => {
        assert.strictEqual(err instanceof GeneralError, true);
        assert.deepStrictEqual(err.getClientError(response), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: PAGINATION.CURSOR.ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Read multiple validation: Page size too low', (context) => {
    const { request, response } = createHttpMocks<ResponseWithContext>({
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
      (err: GeneralError) => {
        assert.strictEqual(err instanceof GeneralError, true);
        assert.deepStrictEqual(err.getClientError(response), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: PAGINATION.PAGE_SIZE.MIN_LENGTH.ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Read multiple validation: Page size too high', (context) => {
    const { request, response } = createHttpMocks<ResponseWithContext>({
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
      (err: GeneralError) => {
        assert.strictEqual(err instanceof GeneralError, true);
        assert.deepStrictEqual(err.getClientError(response), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: PAGINATION.PAGE_SIZE.MAX_LENGTH.ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Read multiple validation: Invalid page size', (context) => {
    const { request, response } = createHttpMocks<ResponseWithContext>({
      logger,
      reqOptions: {
        query: { 'page-size': randomAlphaNumericString() },
      },
    });

    const validateGetUsersSpy = context.mock.fn(
      validationFunctions.validateGetUsers,
    );

    assert.throws(
      () => {
        validateGetUsersSpy(request);
      },
      (err: GeneralError) => {
        assert.strictEqual(err instanceof GeneralError, true);
        assert.deepStrictEqual(err.getClientError(response), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: PAGINATION.PAGE_SIZE.INVALID_TYPE_ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Create validation: Missing first name', (context) => {
    const { request, response } = createHttpMocks<ResponseWithContext>({
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
      (err: GeneralError) => {
        assert.strictEqual(err instanceof GeneralError, true);
        assert.deepStrictEqual(err.getClientError(response), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: USER.FIRST_NAME.REQUIRED_ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Create validation: Empty first name', (context) => {
    const { request, response } = createHttpMocks<ResponseWithContext>({
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
      (err: GeneralError) => {
        assert.strictEqual(err instanceof GeneralError, true);
        assert.deepStrictEqual(err.getClientError(response), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: USER.FIRST_NAME.MIN_LENGTH.ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Create validation: First name too short', (context) => {
    const { request, response } = createHttpMocks<ResponseWithContext>({
      logger,
      reqOptions: {
        body: {
          ...generateRandomUserData(),
          firstName: randomAlphaNumericString(
            USER.FIRST_NAME.MIN_LENGTH.VALUE - 1,
          ),
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
      (err: GeneralError) => {
        assert.strictEqual(err instanceof GeneralError, true);
        assert.deepStrictEqual(err.getClientError(response), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: USER.FIRST_NAME.MIN_LENGTH.ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Create validation: First name too long', (context) => {
    const { request, response } = createHttpMocks<ResponseWithContext>({
      logger,
      reqOptions: {
        body: {
          ...generateRandomUserData(),
          firstName: randomAlphaNumericString(
            USER.FIRST_NAME.MAX_LENGTH.VALUE + 1,
          ),
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
      (err: GeneralError) => {
        assert.strictEqual(err instanceof GeneralError, true);
        assert.deepStrictEqual(err.getClientError(response), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: USER.FIRST_NAME.MAX_LENGTH.ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Create validation: Missing last name', (context) => {
    const { request, response } = createHttpMocks<ResponseWithContext>({
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
      (err: GeneralError) => {
        assert.strictEqual(err instanceof GeneralError, true);
        assert.deepStrictEqual(err.getClientError(response), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: USER.LAST_NAME.REQUIRED_ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Create validation: Empty last name', (context) => {
    const { request, response } = createHttpMocks<ResponseWithContext>({
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
      (err: GeneralError) => {
        assert.strictEqual(err instanceof GeneralError, true);
        assert.deepStrictEqual(err.getClientError(response), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: USER.LAST_NAME.MIN_LENGTH.ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Create validation: Last name too short', (context) => {
    const { request, response } = createHttpMocks<ResponseWithContext>({
      logger,
      reqOptions: {
        body: {
          ...generateRandomUserData(),
          lastName: randomAlphaNumericString(
            USER.LAST_NAME.MIN_LENGTH.VALUE - 1,
          ),
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
      (err: GeneralError) => {
        assert.strictEqual(err instanceof GeneralError, true);
        assert.deepStrictEqual(err.getClientError(response), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: USER.LAST_NAME.MIN_LENGTH.ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Create validation: Last name too long', (context) => {
    const { request, response } = createHttpMocks<ResponseWithContext>({
      logger,
      reqOptions: {
        body: {
          ...generateRandomUserData(),
          lastName: randomAlphaNumericString(
            USER.LAST_NAME.MAX_LENGTH.VALUE + 1,
          ),
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
      (err: GeneralError) => {
        assert.strictEqual(err instanceof GeneralError, true);
        assert.deepStrictEqual(err.getClientError(response), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: USER.LAST_NAME.MAX_LENGTH.ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Create validation: Missing email', (context) => {
    const { request, response } = createHttpMocks<ResponseWithContext>({
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
  await test('Invalid - Create validation: Empty email', (context) => {
    const { request, response } = createHttpMocks<ResponseWithContext>({
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
      (err: GeneralError) => {
        assert.strictEqual(err instanceof GeneralError, true);
        assert.deepStrictEqual(err.getClientError(response), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: `${USER.EMAIL.MIN_LENGTH.ERROR_MESSAGE}, ${USER.EMAIL.ERROR_MESSAGE}`,
        });

        return true;
      },
    );
  });
  await test('Invalid - Create validation: Email too short', (context) => {
    const { request, response } = createHttpMocks<ResponseWithContext>({
      logger,
      reqOptions: {
        body: {
          ...generateRandomUserData(),
          email: randomAlphaNumericString(USER.EMAIL.MIN_LENGTH.VALUE - 1),
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
      (err: GeneralError) => {
        assert.strictEqual(err instanceof GeneralError, true);
        assert.deepStrictEqual(err.getClientError(response), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: `${USER.EMAIL.MIN_LENGTH.ERROR_MESSAGE}, ${USER.EMAIL.ERROR_MESSAGE}`,
        });

        return true;
      },
    );
  });
  await test('Invalid - Create validation: Email too long', (context) => {
    const { request, response } = createHttpMocks<ResponseWithContext>({
      logger,
      reqOptions: {
        body: {
          ...generateRandomUserData(),
          email: `${randomAlphaNumericString(USER.EMAIL.MAX_LENGTH.VALUE + 1)}@ph.com`,
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
  await test('Invalid - Create validation: Invalid email', (context) => {
    const { request, response } = createHttpMocks<ResponseWithContext>({
      logger,
      reqOptions: {
        body: {
          ...generateRandomUserData(),
          email: randomAlphaNumericString(),
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
  await test('Invalid - Create validation: Missing password', (context) => {
    const { request, response } = createHttpMocks<ResponseWithContext>({
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
  await test('Invalid - Create validation: Empty password', (context) => {
    const { request, response } = createHttpMocks<ResponseWithContext>({
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
  await test('Invalid - Create validation: Password too short', (context) => {
    const { request, response } = createHttpMocks<ResponseWithContext>({
      logger,
      reqOptions: {
        body: {
          ...generateRandomUserData(),
          password: randomAlphaNumericString(
            USER.PASSWORD.MIN_LENGTH.VALUE - 1,
          ),
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
  await test('Invalid - Create validation: Password too long', (context) => {
    const { request, response } = createHttpMocks<ResponseWithContext>({
      logger,
      reqOptions: {
        body: {
          ...generateRandomUserData(),
          password: randomAlphaNumericString(
            USER.PASSWORD.MAX_LENGTH.VALUE + 1,
          ),
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
  await test('Invalid - Create validation: Missing role id', (context) => {
    const { request, response } = createHttpMocks<ResponseWithContext>({
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
      (err: GeneralError) => {
        assert.strictEqual(err instanceof GeneralError, true);
        assert.deepStrictEqual(err.getClientError(response), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: USER.ROLE_ID.REQUIRED_ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Create validation: Empty role id', (context) => {
    const { request, response } = createHttpMocks<ResponseWithContext>({
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
      (err: GeneralError) => {
        assert.strictEqual(err instanceof GeneralError, true);
        assert.deepStrictEqual(err.getClientError(response), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: USER.ROLE_ID.ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Create validation: Invalid role id', (context) => {
    const { request, response } = createHttpMocks<ResponseWithContext>({
      logger,
      reqOptions: {
        body: {
          ...generateRandomUserData(),
          roleId: randomAlphaNumericString(),
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
      (err: GeneralError) => {
        assert.strictEqual(err instanceof GeneralError, true);
        assert.deepStrictEqual(err.getClientError(response), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: USER.ROLE_ID.ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Create service: Duplicate entry', async () => {
    const { response } = createHttpMocks<ResponseWithContext>({ logger });
    const { createdUser, createdRole } = await seedUser(serverParams, true);

    try {
      await assert.rejects(
        async () => {
          // In case the function does not throw, we want to clean the created entry
          await serviceFunctions.createUser(
            {
              authentication: serverParams.authentication,
              fileManager: serverParams.fileManager,
              database: serverParams.database,
              messageQueue: serverParams.messageQueue,
              logger,
            },
            {
              ...generateRandomUserData(createdRole.id),
              email: createdUser.email,
            },
          );
        },
        (err: GeneralError) => {
          assert.strictEqual(err instanceof GeneralError, true);
          assert.deepStrictEqual(err.getClientError(response), {
            code: HTTP_STATUS_CODES.CONFLICT,
            message: `User '${createdUser.email}' already exists`,
          });

          return true;
        },
      );
    } finally {
      await clearDatabase(serverParams);
    }
  });
  await test('Invalid - Create service: Non-existent role id', async () => {
    const roleId = randomUUID();
    const { response } = createHttpMocks<ResponseWithContext>({ logger });

    await assert.rejects(
      async () => {
        await serviceFunctions.createUser(
          {
            authentication: serverParams.authentication,
            fileManager: serverParams.fileManager,
            database: serverParams.database,
            messageQueue: serverParams.messageQueue,
            logger,
          },
          generateRandomUserData(roleId),
        );
      },
      (err: GeneralError) => {
        assert.strictEqual(err instanceof GeneralError, true);
        assert.deepStrictEqual(err.getClientError(response), {
          code: HTTP_STATUS_CODES.NOT_FOUND,
          message: `Role '${roleId}' does not exist`,
        });

        return true;
      },
    );
  });
  await test('Invalid - Update validation: Without updates', (context) => {
    const { request, response } = createHttpMocks<ResponseWithContext>({
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
      (err: GeneralError) => {
        assert.strictEqual(err instanceof GeneralError, true);
        assert.deepStrictEqual(err.getClientError(response), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: USER.NO_FIELDS_TO_UPDATE_ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Update validation: Missing id', (context) => {
    const { request, response } = createHttpMocks<ResponseWithContext>({
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
      (err: GeneralError) => {
        assert.strictEqual(err instanceof GeneralError, true);
        assert.deepStrictEqual(err.getClientError(response), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: USER.ID.REQUIRED_ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Update validation: Empty id', (context) => {
    const { request, response } = createHttpMocks<ResponseWithContext>({
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
      (err: GeneralError) => {
        assert.strictEqual(err instanceof GeneralError, true);
        assert.deepStrictEqual(err.getClientError(response), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: USER.ID.ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Update validation: Invalid id', (context) => {
    const { request, response } = createHttpMocks<ResponseWithContext>({
      logger,
      reqOptions: {
        params: { user_id: randomAlphaNumericString() },
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
      (err: GeneralError) => {
        assert.strictEqual(err instanceof GeneralError, true);
        assert.deepStrictEqual(err.getClientError(response), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: USER.ID.ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Update validation: Empty first name', (context) => {
    const { request, response } = createHttpMocks<ResponseWithContext>({
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
      (err: GeneralError) => {
        assert.strictEqual(err instanceof GeneralError, true);
        assert.deepStrictEqual(err.getClientError(response), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: USER.FIRST_NAME.MIN_LENGTH.ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Update validation: First name too short', (context) => {
    const { request, response } = createHttpMocks<ResponseWithContext>({
      logger,
      reqOptions: {
        params: { user_id: randomUUID() },
        body: {
          firstName: randomAlphaNumericString(
            USER.FIRST_NAME.MIN_LENGTH.VALUE - 1,
          ),
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
      (err: GeneralError) => {
        assert.strictEqual(err instanceof GeneralError, true);
        assert.deepStrictEqual(err.getClientError(response), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: USER.FIRST_NAME.MIN_LENGTH.ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Update validation: First name too long', (context) => {
    const { request, response } = createHttpMocks<ResponseWithContext>({
      logger,
      reqOptions: {
        params: { user_id: randomUUID() },
        body: {
          firstName: randomAlphaNumericString(
            USER.FIRST_NAME.MAX_LENGTH.VALUE + 1,
          ),
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
      (err: GeneralError) => {
        assert.strictEqual(err instanceof GeneralError, true);
        assert.deepStrictEqual(err.getClientError(response), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: USER.FIRST_NAME.MAX_LENGTH.ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Update validation: Empty last name', (context) => {
    const { request, response } = createHttpMocks<ResponseWithContext>({
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
      (err: GeneralError) => {
        assert.strictEqual(err instanceof GeneralError, true);
        assert.deepStrictEqual(err.getClientError(response), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: USER.LAST_NAME.MIN_LENGTH.ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Update validation: Last name too short', (context) => {
    const { request, response } = createHttpMocks<ResponseWithContext>({
      logger,
      reqOptions: {
        params: { user_id: randomUUID() },
        body: {
          lastName: randomAlphaNumericString(
            USER.LAST_NAME.MIN_LENGTH.VALUE - 1,
          ),
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
      (err: GeneralError) => {
        assert.strictEqual(err instanceof GeneralError, true);
        assert.deepStrictEqual(err.getClientError(response), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: USER.LAST_NAME.MIN_LENGTH.ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Update validation: Last name too long', (context) => {
    const { request, response } = createHttpMocks<ResponseWithContext>({
      logger,
      reqOptions: {
        params: { user_id: randomUUID() },
        body: {
          lastName: randomAlphaNumericString(
            USER.LAST_NAME.MAX_LENGTH.VALUE + 1,
          ),
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
      (err: GeneralError) => {
        assert.strictEqual(err instanceof GeneralError, true);
        assert.deepStrictEqual(err.getClientError(response), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: USER.LAST_NAME.MAX_LENGTH.ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Update validation: Empty email', (context) => {
    const { request, response } = createHttpMocks<ResponseWithContext>({
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
      (err: GeneralError) => {
        assert.strictEqual(err instanceof GeneralError, true);
        assert.deepStrictEqual(err.getClientError(response), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: `${USER.EMAIL.MIN_LENGTH.ERROR_MESSAGE}, ${USER.EMAIL.ERROR_MESSAGE}`,
        });

        return true;
      },
    );
  });
  await test('Invalid - Update validation: Email too short', (context) => {
    const { request, response } = createHttpMocks<ResponseWithContext>({
      logger,
      reqOptions: {
        params: { user_id: randomUUID() },
        body: {
          email: randomAlphaNumericString(USER.EMAIL.MIN_LENGTH.VALUE - 1),
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
      (err: GeneralError) => {
        assert.strictEqual(err instanceof GeneralError, true);
        assert.deepStrictEqual(err.getClientError(response), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: `${USER.EMAIL.MIN_LENGTH.ERROR_MESSAGE}, ${USER.EMAIL.ERROR_MESSAGE}`,
        });

        return true;
      },
    );
  });
  await test('Invalid - Update validation: Email too long', (context) => {
    const { request, response } = createHttpMocks<ResponseWithContext>({
      logger,
      reqOptions: {
        params: { user_id: randomUUID() },
        body: {
          email: `${randomAlphaNumericString(USER.EMAIL.MAX_LENGTH.VALUE + 1)}@ph.com`,
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
  await test('Invalid - Update validation: Invalid email', (context) => {
    const { request, response } = createHttpMocks<ResponseWithContext>({
      logger,
      reqOptions: {
        params: { user_id: randomUUID() },
        body: { email: randomAlphaNumericString(32), roleId: randomUUID() },
      },
    });

    const validateUpdateUserSpy = context.mock.fn(
      validationFunctions.validateUpdateUser,
    );

    assert.throws(
      () => {
        validateUpdateUserSpy(request);
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
  await test('Invalid - Update validation: Empty password', (context) => {
    const { request, response } = createHttpMocks<ResponseWithContext>({
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
  await test('Invalid - Update validation: Password too short', (context) => {
    const { request, response } = createHttpMocks<ResponseWithContext>({
      logger,
      reqOptions: {
        params: { user_id: randomUUID() },
        body: {
          password: randomAlphaNumericString(
            USER.PASSWORD.MIN_LENGTH.VALUE - 1,
          ),
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
  await test('Invalid - Update validation: Password too long', (context) => {
    const { request, response } = createHttpMocks<ResponseWithContext>({
      logger,
      reqOptions: {
        params: { user_id: randomUUID() },
        body: {
          password: randomAlphaNumericString(
            USER.PASSWORD.MAX_LENGTH.VALUE + 1,
          ),
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
  await test('Invalid - Update validation: Empty role id', (context) => {
    const { request, response } = createHttpMocks<ResponseWithContext>({
      logger,
      reqOptions: {
        params: { user_id: randomUUID() },
        body: { firstName: randomAlphaNumericString(), roleId: '' },
      },
    });

    const validateUpdateUserSpy = context.mock.fn(
      validationFunctions.validateUpdateUser,
    );

    assert.throws(
      () => {
        validateUpdateUserSpy(request);
      },
      (err: GeneralError) => {
        assert.strictEqual(err instanceof GeneralError, true);
        assert.deepStrictEqual(err.getClientError(response), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: USER.ROLE_ID.ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Update validation: Invalid role id', (context) => {
    const { request, response } = createHttpMocks<ResponseWithContext>({
      logger,
      reqOptions: {
        params: { user_id: randomUUID() },
        body: {
          firstName: randomAlphaNumericString(
            USER.FIRST_NAME.MIN_LENGTH.VALUE + 1,
          ),
          roleId: randomAlphaNumericString(),
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
      (err: GeneralError) => {
        assert.strictEqual(err instanceof GeneralError, true);
        assert.deepStrictEqual(err.getClientError(response), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: USER.ROLE_ID.ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Update service: Non-existent user', async () => {
    const userId = randomUUID();
    const { response } = createHttpMocks<ResponseWithContext>({ logger });

    await assert.rejects(
      async () => {
        await serviceFunctions.updateUser(
          {
            authentication: serverParams.authentication,
            fileManager: serverParams.fileManager,
            database: serverParams.database,
            messageQueue: serverParams.messageQueue,
            logger,
          },
          {
            userId,
            firstName: randomAlphaNumericString(
              USER.FIRST_NAME.MIN_LENGTH.VALUE + 1,
            ),
          },
        );
      },
      (err: GeneralError) => {
        assert.strictEqual(err instanceof GeneralError, true);
        assert.deepStrictEqual(err.getClientError(response), {
          code: HTTP_STATUS_CODES.NOT_FOUND,
          message: `User '${userId}' does not exist`,
        });

        return true;
      },
    );
  });
  await test('Invalid - Update service: Duplicate entry', async () => {
    const { response } = createHttpMocks<ResponseWithContext>({ logger });
    const { createdUsers } = await seedUsers(serverParams, 2);

    try {
      await assert.rejects(
        async () => {
          await serviceFunctions.updateUser(
            {
              authentication: serverParams.authentication,
              fileManager: serverParams.fileManager,
              database: serverParams.database,
              messageQueue: serverParams.messageQueue,
              logger,
            },
            {
              userId: createdUsers[0]!.id,
              email: createdUsers[1]!.email,
            },
          );
        },
        (err: GeneralError) => {
          assert.strictEqual(err instanceof GeneralError, true);
          assert.deepStrictEqual(err.getClientError(response), {
            code: HTTP_STATUS_CODES.CONFLICT,
            message: `User '${createdUsers[1]!.email}' already exists`,
          });

          return true;
        },
      );
    } finally {
      await clearDatabase(serverParams);
    }
  });
  await test('Invalid - Update service: Non-existent role id', async () => {
    const updatedRoleId = randomUUID();
    const { response } = createHttpMocks<ResponseWithContext>({ logger });

    const { createdUser } = await seedUser(serverParams, true);

    try {
      await assert.rejects(
        async () => {
          await serviceFunctions.updateUser(
            {
              authentication: serverParams.authentication,
              fileManager: serverParams.fileManager,
              database: serverParams.database,
              messageQueue: serverParams.messageQueue,
              logger,
            },
            {
              userId: createdUser.id,
              roleId: updatedRoleId,
            },
          );
        },
        (err: GeneralError) => {
          assert.strictEqual(err instanceof GeneralError, true);
          assert.deepStrictEqual(err.getClientError(response), {
            code: HTTP_STATUS_CODES.NOT_FOUND,
            message: `Role '${updatedRoleId}' does not exist`,
          });

          return true;
        },
      );
    } finally {
      await clearDatabase(serverParams);
    }
  });
  await test('Invalid - Delete validation: Missing id', (context) => {
    const { request, response } = createHttpMocks<ResponseWithContext>({
      logger,
    });

    const validateDeleteUserSpy = context.mock.fn(
      validationFunctions.validateDeleteUser,
    );

    assert.throws(
      () => {
        validateDeleteUserSpy(request);
      },
      (err: GeneralError) => {
        assert.strictEqual(err instanceof GeneralError, true);
        assert.deepStrictEqual(err.getClientError(response), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: USER.ID.REQUIRED_ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Delete validation: Empty id', (context) => {
    const { request, response } = createHttpMocks<ResponseWithContext>({
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
      (err: GeneralError) => {
        assert.strictEqual(err instanceof GeneralError, true);
        assert.deepStrictEqual(err.getClientError(response), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: USER.ID.ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Delete validation: Invalid id', (context) => {
    const { request, response } = createHttpMocks<ResponseWithContext>({
      logger,
      reqOptions: { params: { user_id: randomAlphaNumericString() } },
    });

    const validateDeleteUserSpy = context.mock.fn(
      validationFunctions.validateDeleteUser,
    );

    assert.throws(
      () => {
        validateDeleteUserSpy(request);
      },
      (err: GeneralError) => {
        assert.strictEqual(err instanceof GeneralError, true);
        assert.deepStrictEqual(err.getClientError(response), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: USER.ID.ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
});
