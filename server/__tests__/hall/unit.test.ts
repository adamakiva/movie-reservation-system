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
  randomNumber,
  randomUUID,
  suite,
  terminateServer,
  test,
  type LoggerHandler,
  type ResponseWithContext,
  type ServerParams,
} from '../utils.ts';

import {
  HALL,
  seedHall,
  seedHalls,
  serviceFunctions,
  validationFunctions,
} from './utils.ts';

/**********************************************************************************/

await suite('Hall unit tests', async () => {
  let logger: LoggerHandler = null!;
  let serverParams: ServerParams = null!;
  before(async () => {
    ({ logger } = mockLogger());
    serverParams = await initServer();
  });
  after(() => {
    terminateServer(serverParams);
  });

  await test('Invalid - Create validation: Missing name', (context) => {
    const { request, response } = createHttpMocks<ResponseWithContext>({
      logger,
      reqOptions: {
        body: {
          rows: randomNumber(
            HALL.ROWS.MIN_LENGTH.VALUE + 1,
            HALL.ROWS.MAX_LENGTH.VALUE - 1,
          ),
          columns: randomNumber(
            HALL.COLUMNS.MIN_LENGTH.VALUE + 1,
            HALL.COLUMNS.MAX_LENGTH.VALUE - 1,
          ),
        },
      },
    });

    const validateCreateHallSpy = context.mock.fn(
      validationFunctions.validateCreateHall,
    );

    assert.throws(
      () => {
        validateCreateHallSpy(request);
      },
      (err: GeneralError) => {
        assert.strictEqual(err instanceof GeneralError, true);
        assert.deepStrictEqual(err.getClientError(response), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: HALL.NAME.REQUIRED_ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Create validation: Empty name', (context) => {
    const { request, response } = createHttpMocks<ResponseWithContext>({
      logger,
      reqOptions: {
        body: {
          name: '',
          rows: randomNumber(
            HALL.ROWS.MIN_LENGTH.VALUE + 1,
            HALL.ROWS.MAX_LENGTH.VALUE - 1,
          ),
          columns: randomNumber(
            HALL.COLUMNS.MIN_LENGTH.VALUE + 1,
            HALL.COLUMNS.MAX_LENGTH.VALUE - 1,
          ),
        },
      },
    });

    const validateCreateHallSpy = context.mock.fn(
      validationFunctions.validateCreateHall,
    );

    assert.throws(
      () => {
        validateCreateHallSpy(request);
      },
      (err: GeneralError) => {
        assert.strictEqual(err instanceof GeneralError, true);
        assert.deepStrictEqual(err.getClientError(response), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: HALL.NAME.MIN_LENGTH.ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Create validation: Name too short', (context) => {
    const { request, response } = createHttpMocks<ResponseWithContext>({
      logger,
      reqOptions: {
        body: {
          name: randomAlphaNumericString(HALL.NAME.MIN_LENGTH.VALUE - 1),
          rows: randomNumber(
            HALL.ROWS.MIN_LENGTH.VALUE + 1,
            HALL.ROWS.MAX_LENGTH.VALUE - 1,
          ),
          columns: randomNumber(
            HALL.COLUMNS.MIN_LENGTH.VALUE + 1,
            HALL.COLUMNS.MAX_LENGTH.VALUE - 1,
          ),
        },
      },
    });

    const validateCreateHallSpy = context.mock.fn(
      validationFunctions.validateCreateHall,
    );

    assert.throws(
      () => {
        validateCreateHallSpy(request);
      },
      (err: GeneralError) => {
        assert.strictEqual(err instanceof GeneralError, true);
        assert.deepStrictEqual(err.getClientError(response), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: HALL.NAME.MIN_LENGTH.ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Create validation: Name too long', (context) => {
    const { request, response } = createHttpMocks<ResponseWithContext>({
      logger,
      reqOptions: {
        body: {
          name: randomAlphaNumericString(HALL.NAME.MAX_LENGTH.VALUE + 1),
          rows: randomNumber(
            HALL.ROWS.MIN_LENGTH.VALUE + 1,
            HALL.ROWS.MAX_LENGTH.VALUE - 1,
          ),
          columns: randomNumber(
            HALL.COLUMNS.MIN_LENGTH.VALUE + 1,
            HALL.COLUMNS.MAX_LENGTH.VALUE - 1,
          ),
        },
      },
    });

    const validateCreateHallSpy = context.mock.fn(
      validationFunctions.validateCreateHall,
    );

    assert.throws(
      () => {
        validateCreateHallSpy(request);
      },
      (err: GeneralError) => {
        assert.strictEqual(err instanceof GeneralError, true);
        assert.deepStrictEqual(err.getClientError(response), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: HALL.NAME.MAX_LENGTH.ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Create validation: Missing rows', (context) => {
    const { request, response } = createHttpMocks<ResponseWithContext>({
      logger,
      reqOptions: {
        body: {
          name: randomAlphaNumericString(HALL.NAME.MIN_LENGTH.VALUE + 1),
          columns: randomNumber(
            HALL.COLUMNS.MIN_LENGTH.VALUE + 1,
            HALL.COLUMNS.MAX_LENGTH.VALUE - 1,
          ),
        },
      },
    });

    const validateCreateHallSpy = context.mock.fn(
      validationFunctions.validateCreateHall,
    );

    assert.throws(
      () => {
        validateCreateHallSpy(request);
      },
      (err: GeneralError) => {
        assert.strictEqual(err instanceof GeneralError, true);
        assert.deepStrictEqual(err.getClientError(response), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: HALL.ROWS.REQUIRED_ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Create validation: Empty rows', (context) => {
    const { request, response } = createHttpMocks<ResponseWithContext>({
      logger,
      reqOptions: {
        body: {
          name: randomAlphaNumericString(HALL.NAME.MIN_LENGTH.VALUE + 1),
          rows: '',
          columns: randomNumber(
            HALL.COLUMNS.MIN_LENGTH.VALUE + 1,
            HALL.COLUMNS.MAX_LENGTH.VALUE - 1,
          ),
        },
      },
    });

    const validateCreateHallSpy = context.mock.fn(
      validationFunctions.validateCreateHall,
    );

    assert.throws(
      () => {
        validateCreateHallSpy(request);
      },
      (err: GeneralError) => {
        assert.strictEqual(err instanceof GeneralError, true);
        assert.deepStrictEqual(err.getClientError(response), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: HALL.ROWS.INVALID_TYPE_ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Create validation: Rows number too low', (context) => {
    const { request, response } = createHttpMocks<ResponseWithContext>({
      logger,
      reqOptions: {
        body: {
          name: randomAlphaNumericString(HALL.NAME.MIN_LENGTH.VALUE + 1),
          rows: HALL.ROWS.MIN_LENGTH.VALUE - 1,
          columns: randomNumber(
            HALL.COLUMNS.MIN_LENGTH.VALUE + 1,
            HALL.COLUMNS.MAX_LENGTH.VALUE - 1,
          ),
        },
      },
    });

    const validateCreateHallSpy = context.mock.fn(
      validationFunctions.validateCreateHall,
    );

    assert.throws(
      () => {
        validateCreateHallSpy(request);
      },
      (err: GeneralError) => {
        assert.strictEqual(err instanceof GeneralError, true);
        assert.deepStrictEqual(err.getClientError(response), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: HALL.ROWS.MIN_LENGTH.ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Create validation: Rows number too high', (context) => {
    const { request, response } = createHttpMocks<ResponseWithContext>({
      logger,
      reqOptions: {
        body: {
          name: randomAlphaNumericString(HALL.NAME.MIN_LENGTH.VALUE + 1),
          rows: HALL.ROWS.MAX_LENGTH.VALUE + 1,
          columns: randomNumber(
            HALL.COLUMNS.MIN_LENGTH.VALUE + 1,
            HALL.COLUMNS.MAX_LENGTH.VALUE - 1,
          ),
        },
      },
    });

    const validateCreateHallSpy = context.mock.fn(
      validationFunctions.validateCreateHall,
    );

    assert.throws(
      () => {
        validateCreateHallSpy(request);
      },
      (err: GeneralError) => {
        assert.strictEqual(err instanceof GeneralError, true);
        assert.deepStrictEqual(err.getClientError(response), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: HALL.ROWS.MAX_LENGTH.ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Create validation: Missing columns', (context) => {
    const { request, response } = createHttpMocks<ResponseWithContext>({
      logger,
      reqOptions: {
        body: {
          name: randomAlphaNumericString(HALL.NAME.MIN_LENGTH.VALUE + 1),
          rows: randomNumber(
            HALL.ROWS.MIN_LENGTH.VALUE + 1,
            HALL.ROWS.MAX_LENGTH.VALUE - 1,
          ),
        },
      },
    });

    const validateCreateHallSpy = context.mock.fn(
      validationFunctions.validateCreateHall,
    );

    assert.throws(
      () => {
        validateCreateHallSpy(request);
      },
      (err: GeneralError) => {
        assert.strictEqual(err instanceof GeneralError, true);
        assert.deepStrictEqual(err.getClientError(response), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: HALL.COLUMNS.REQUIRED_ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Create validation: Empty columns', (context) => {
    const { request, response } = createHttpMocks<ResponseWithContext>({
      logger,
      reqOptions: {
        body: {
          name: randomAlphaNumericString(HALL.NAME.MIN_LENGTH.VALUE + 1),
          rows: randomNumber(
            HALL.ROWS.MIN_LENGTH.VALUE + 1,
            HALL.ROWS.MAX_LENGTH.VALUE - 1,
          ),
          columns: '',
        },
      },
    });

    const validateCreateHallSpy = context.mock.fn(
      validationFunctions.validateCreateHall,
    );

    assert.throws(
      () => {
        validateCreateHallSpy(request);
      },
      (err: GeneralError) => {
        assert.strictEqual(err instanceof GeneralError, true);
        assert.deepStrictEqual(err.getClientError(response), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: HALL.COLUMNS.INVALID_TYPE_ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Create validation: Columns number too low', (context) => {
    const { request, response } = createHttpMocks<ResponseWithContext>({
      logger,
      reqOptions: {
        body: {
          name: randomAlphaNumericString(HALL.NAME.MIN_LENGTH.VALUE + 1),
          rows: randomNumber(
            HALL.ROWS.MIN_LENGTH.VALUE + 1,
            HALL.ROWS.MAX_LENGTH.VALUE - 1,
          ),
          columns: HALL.COLUMNS.MIN_LENGTH.VALUE - 1,
        },
      },
    });

    const validateCreateHallSpy = context.mock.fn(
      validationFunctions.validateCreateHall,
    );

    assert.throws(
      () => {
        validateCreateHallSpy(request);
      },
      (err: GeneralError) => {
        assert.strictEqual(err instanceof GeneralError, true);
        assert.deepStrictEqual(err.getClientError(response), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: HALL.COLUMNS.MIN_LENGTH.ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Create validation: Columns number too high', (context) => {
    const { request, response } = createHttpMocks<ResponseWithContext>({
      logger,
      reqOptions: {
        body: {
          name: randomAlphaNumericString(HALL.NAME.MIN_LENGTH.VALUE + 1),
          rows: randomNumber(
            HALL.ROWS.MIN_LENGTH.VALUE + 1,
            HALL.ROWS.MAX_LENGTH.VALUE - 1,
          ),
          columns: HALL.COLUMNS.MAX_LENGTH.VALUE + 1,
        },
      },
    });

    const validateCreateHallSpy = context.mock.fn(
      validationFunctions.validateCreateHall,
    );

    assert.throws(
      () => {
        validateCreateHallSpy(request);
      },
      (err: GeneralError) => {
        assert.strictEqual(err instanceof GeneralError, true);
        assert.deepStrictEqual(err.getClientError(response), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: HALL.COLUMNS.MAX_LENGTH.ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Create service: Duplicate entry', async () => {
    const { response } = createHttpMocks<ResponseWithContext>({ logger });
    const { name: hallName } = await seedHall(serverParams);

    const hallToCreate = {
      name: hallName,
      rows: randomNumber(
        HALL.ROWS.MIN_LENGTH.VALUE + 1,
        HALL.ROWS.MAX_LENGTH.VALUE - 1,
      ),
      columns: randomNumber(
        HALL.COLUMNS.MIN_LENGTH.VALUE + 1,
        HALL.COLUMNS.MAX_LENGTH.VALUE - 1,
      ),
    };

    try {
      await assert.rejects(
        async () => {
          // In case the function does not throw, we want to clean the created entry
          await serviceFunctions.createHall(
            {
              authentication: serverParams.authentication,
              fileManager: serverParams.fileManager,
              database: serverParams.database,
              messageQueue: serverParams.messageQueue,
              logger,
            },
            hallToCreate,
          );
        },
        (err: GeneralError) => {
          assert.strictEqual(err instanceof GeneralError, true);
          assert.deepStrictEqual(err.getClientError(response), {
            code: HTTP_STATUS_CODES.CONFLICT,
            message: `Hall '${hallName}' already exists`,
          });

          return true;
        },
      );
    } finally {
      await clearDatabase(serverParams);
    }
  });
  await test('Invalid - Update validation: Without updates', (context) => {
    const { request, response } = createHttpMocks<ResponseWithContext>({
      logger,
      reqOptions: {
        params: {
          hall_id: randomUUID(),
        },
      },
    });

    const validateUpdateHallSpy = context.mock.fn(
      validationFunctions.validateUpdateHall,
    );

    assert.throws(
      () => {
        validateUpdateHallSpy(request);
      },
      (err: GeneralError) => {
        assert.strictEqual(err instanceof GeneralError, true);
        assert.deepStrictEqual(err.getClientError(response), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: HALL.NO_FIELDS_TO_UPDATE_ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Update validation: Missing id', (context) => {
    const { request, response } = createHttpMocks<ResponseWithContext>({
      logger,
      reqOptions: {
        body: {
          name: randomAlphaNumericString(),
        },
      },
    });

    const validateUpdateHallSpy = context.mock.fn(
      validationFunctions.validateUpdateHall,
    );

    assert.throws(
      () => {
        validateUpdateHallSpy(request);
      },
      (err: GeneralError) => {
        assert.strictEqual(err instanceof GeneralError, true);
        assert.deepStrictEqual(err.getClientError(response), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: HALL.ID.REQUIRED_ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Update validation: Empty id', (context) => {
    const { request, response } = createHttpMocks<ResponseWithContext>({
      logger,
      reqOptions: {
        params: {
          hall_id: '',
        },
        body: {
          name: randomAlphaNumericString(),
        },
      },
    });

    const validateUpdateHallSpy = context.mock.fn(
      validationFunctions.validateUpdateHall,
    );

    assert.throws(
      () => {
        validateUpdateHallSpy(request);
      },
      (err: GeneralError) => {
        assert.strictEqual(err instanceof GeneralError, true);
        assert.deepStrictEqual(err.getClientError(response), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: HALL.ID.ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Update validation: Invalid id', (context) => {
    const { request, response } = createHttpMocks<ResponseWithContext>({
      logger,
      reqOptions: {
        params: {
          hall_id: randomAlphaNumericString(),
        },
        body: {
          name: randomAlphaNumericString(),
        },
      },
    });

    const validateUpdateHallSpy = context.mock.fn(
      validationFunctions.validateUpdateHall,
    );

    assert.throws(
      () => {
        validateUpdateHallSpy(request);
      },
      (err: GeneralError) => {
        assert.strictEqual(err instanceof GeneralError, true);
        assert.deepStrictEqual(err.getClientError(response), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: HALL.ID.ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Update validation: Empty name', (context) => {
    const { request, response } = createHttpMocks<ResponseWithContext>({
      logger,
      reqOptions: {
        params: {
          hall_id: randomUUID(),
        },
        body: {
          name: '',
        },
      },
    });

    const validateUpdateHallSpy = context.mock.fn(
      validationFunctions.validateUpdateHall,
    );

    assert.throws(
      () => {
        validateUpdateHallSpy(request);
      },
      (err: GeneralError) => {
        assert.strictEqual(err instanceof GeneralError, true);
        assert.deepStrictEqual(err.getClientError(response), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: HALL.NAME.MIN_LENGTH.ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Update validation: Name too short', (context) => {
    const { request, response } = createHttpMocks<ResponseWithContext>({
      logger,
      reqOptions: {
        params: {
          hall_id: randomUUID(),
        },
        body: {
          name: randomAlphaNumericString(HALL.NAME.MIN_LENGTH.VALUE - 1),
        },
      },
    });

    const validateUpdateHallSpy = context.mock.fn(
      validationFunctions.validateUpdateHall,
    );

    assert.throws(
      () => {
        validateUpdateHallSpy(request);
      },
      (err: GeneralError) => {
        assert.strictEqual(err instanceof GeneralError, true);
        assert.deepStrictEqual(err.getClientError(response), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: HALL.NAME.MIN_LENGTH.ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Update validation: Name too long', (context) => {
    const { request, response } = createHttpMocks<ResponseWithContext>({
      logger,
      reqOptions: {
        params: {
          hall_id: randomUUID(),
        },
        body: {
          name: randomAlphaNumericString(HALL.NAME.MAX_LENGTH.VALUE + 1),
        },
      },
    });

    const validateUpdateHallSpy = context.mock.fn(
      validationFunctions.validateUpdateHall,
    );

    assert.throws(
      () => {
        validateUpdateHallSpy(request);
      },
      (err: GeneralError) => {
        assert.strictEqual(err instanceof GeneralError, true);
        assert.deepStrictEqual(err.getClientError(response), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: HALL.NAME.MAX_LENGTH.ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Update validation: Empty rows', (context) => {
    const { request, response } = createHttpMocks<ResponseWithContext>({
      logger,
      reqOptions: {
        params: {
          hall_id: randomUUID(),
        },
        body: {
          rows: '',
        },
      },
    });

    const validateUpdateHallSpy = context.mock.fn(
      validationFunctions.validateUpdateHall,
    );

    assert.throws(
      () => {
        validateUpdateHallSpy(request);
      },
      (err: GeneralError) => {
        assert.strictEqual(err instanceof GeneralError, true);
        assert.deepStrictEqual(err.getClientError(response), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: HALL.ROWS.INVALID_TYPE_ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Update validation: Rows number too low', (context) => {
    const { request, response } = createHttpMocks<ResponseWithContext>({
      logger,
      reqOptions: {
        params: {
          hall_id: randomUUID(),
        },
        body: {
          rows: HALL.ROWS.MIN_LENGTH.VALUE - 1,
        },
      },
    });

    const validateUpdateHallSpy = context.mock.fn(
      validationFunctions.validateUpdateHall,
    );

    assert.throws(
      () => {
        validateUpdateHallSpy(request);
      },
      (err: GeneralError) => {
        assert.strictEqual(err instanceof GeneralError, true);
        assert.deepStrictEqual(err.getClientError(response), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: HALL.ROWS.MIN_LENGTH.ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Update validation: Rows number too high', (context) => {
    const { request, response } = createHttpMocks<ResponseWithContext>({
      logger,
      reqOptions: {
        params: {
          hall_id: randomUUID(),
        },
        body: {
          rows: HALL.ROWS.MAX_LENGTH.VALUE + 1,
        },
      },
    });

    const validateUpdateHallSpy = context.mock.fn(
      validationFunctions.validateUpdateHall,
    );

    assert.throws(
      () => {
        validateUpdateHallSpy(request);
      },
      (err: GeneralError) => {
        assert.strictEqual(err instanceof GeneralError, true);
        assert.deepStrictEqual(err.getClientError(response), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: HALL.ROWS.MAX_LENGTH.ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Update validation: Empty columns', (context) => {
    const { request, response } = createHttpMocks<ResponseWithContext>({
      logger,
      reqOptions: {
        params: {
          hall_id: randomUUID(),
        },
        body: {
          columns: '',
        },
      },
    });

    const validateUpdateHallSpy = context.mock.fn(
      validationFunctions.validateUpdateHall,
    );

    assert.throws(
      () => {
        validateUpdateHallSpy(request);
      },
      (err: GeneralError) => {
        assert.strictEqual(err instanceof GeneralError, true);
        assert.deepStrictEqual(err.getClientError(response), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: HALL.COLUMNS.INVALID_TYPE_ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Update validation: Columns number too low', (context) => {
    const { request, response } = createHttpMocks<ResponseWithContext>({
      logger,
      reqOptions: {
        params: {
          hall_id: randomUUID(),
        },
        body: {
          columns: HALL.COLUMNS.MIN_LENGTH.VALUE - 1,
        },
      },
    });

    const validateUpdateHallSpy = context.mock.fn(
      validationFunctions.validateUpdateHall,
    );

    assert.throws(
      () => {
        validateUpdateHallSpy(request);
      },
      (err: GeneralError) => {
        assert.strictEqual(err instanceof GeneralError, true);
        assert.deepStrictEqual(err.getClientError(response), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: HALL.COLUMNS.MIN_LENGTH.ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Update validation: Columns number too high', (context) => {
    const { request, response } = createHttpMocks<ResponseWithContext>({
      logger,
      reqOptions: {
        params: {
          hall_id: randomUUID(),
        },
        body: {
          columns: HALL.COLUMNS.MAX_LENGTH.VALUE + 1,
        },
      },
    });

    const validateUpdateHallSpy = context.mock.fn(
      validationFunctions.validateUpdateHall,
    );

    assert.throws(
      () => {
        validateUpdateHallSpy(request);
      },
      (err: GeneralError) => {
        assert.strictEqual(err instanceof GeneralError, true);
        assert.deepStrictEqual(err.getClientError(response), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: HALL.COLUMNS.MAX_LENGTH.ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Update service: Duplicate entry', async () => {
    const { response } = createHttpMocks<ResponseWithContext>({ logger });
    const createdHalls = await seedHalls(serverParams, 2);

    const hallToUpdate = {
      hallId: createdHalls[0]!.id,
      name: createdHalls[1]!.name,
    };

    try {
      await assert.rejects(
        async () => {
          await serviceFunctions.updateHall(
            {
              authentication: serverParams.authentication,
              fileManager: serverParams.fileManager,
              database: serverParams.database,
              messageQueue: serverParams.messageQueue,
              logger,
            },
            hallToUpdate,
          );
        },
        (err: GeneralError) => {
          assert.strictEqual(err instanceof GeneralError, true);
          assert.deepStrictEqual(err.getClientError(response), {
            code: HTTP_STATUS_CODES.CONFLICT,
            message: `Hall '${createdHalls[1]!.name}' already exists`,
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

    const validateDeleteHallSpy = context.mock.fn(
      validationFunctions.validateDeleteHall,
    );

    assert.throws(
      () => {
        validateDeleteHallSpy(request);
      },
      (err: GeneralError) => {
        assert.strictEqual(err instanceof GeneralError, true);
        assert.deepStrictEqual(err.getClientError(response), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: HALL.ID.REQUIRED_ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Delete validation: Empty id', (context) => {
    const { request, response } = createHttpMocks<ResponseWithContext>({
      logger,
      reqOptions: {
        params: {
          hall_id: '',
        },
      },
    });

    const validateDeleteHallSpy = context.mock.fn(
      validationFunctions.validateDeleteHall,
    );

    assert.throws(
      () => {
        validateDeleteHallSpy(request);
      },
      (err: GeneralError) => {
        assert.strictEqual(err instanceof GeneralError, true);
        assert.deepStrictEqual(err.getClientError(response), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: HALL.ID.ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Delete validation: Invalid id', (context) => {
    const { request, response } = createHttpMocks<ResponseWithContext>({
      logger,
      reqOptions: {
        params: {
          hall_id: randomAlphaNumericString(),
        },
      },
    });

    const validateDeleteHallSpy = context.mock.fn(
      validationFunctions.validateDeleteHall,
    );

    assert.throws(
      () => {
        validateDeleteHallSpy(request);
      },
      (err: GeneralError) => {
        assert.strictEqual(err instanceof GeneralError, true);
        assert.deepStrictEqual(err.getClientError(response), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: HALL.ID.ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
});
