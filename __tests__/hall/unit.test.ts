import {
  after,
  assert,
  before,
  createHttpMocks,
  HTTP_STATUS_CODES,
  initServer,
  mockLogger,
  MRSError,
  randomNumber,
  randomString,
  randomUUID,
  suite,
  terminateServer,
  test,
  VALIDATION,
  type LoggerHandler,
  type ResponseWithContext,
  type ServerParams,
} from '../utils.js';

import {
  deleteHalls,
  seedHall,
  seedHalls,
  serviceFunctions,
  validationFunctions,
} from './utils.js';

/**********************************************************************************/

const { HALL } = VALIDATION;

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
    const { request } = createHttpMocks<ResponseWithContext>({
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
      (err) => {
        assert.strictEqual(err instanceof MRSError, true);
        assert.deepStrictEqual((err as MRSError).getClientError(), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: HALL.NAME.REQUIRED_ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Create validation: Empty name', (context) => {
    const { request } = createHttpMocks<ResponseWithContext>({
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
      (err) => {
        assert.strictEqual(err instanceof MRSError, true);
        assert.deepStrictEqual((err as MRSError).getClientError(), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: HALL.NAME.MIN_LENGTH.ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Create validation: Name too short', (context) => {
    const { request } = createHttpMocks<ResponseWithContext>({
      logger,
      reqOptions: {
        body: {
          name: randomString(HALL.NAME.MIN_LENGTH.VALUE - 1),
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
      (err) => {
        assert.strictEqual(err instanceof MRSError, true);
        assert.deepStrictEqual((err as MRSError).getClientError(), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: HALL.NAME.MIN_LENGTH.ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Create validation: Name too long', (context) => {
    const { request } = createHttpMocks<ResponseWithContext>({
      logger,
      reqOptions: {
        body: {
          name: randomString(HALL.NAME.MAX_LENGTH.VALUE + 1),
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
      (err) => {
        assert.strictEqual(err instanceof MRSError, true);
        assert.deepStrictEqual((err as MRSError).getClientError(), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: HALL.NAME.MAX_LENGTH.ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Create validation: Missing rows', (context) => {
    const { request } = createHttpMocks<ResponseWithContext>({
      logger,
      reqOptions: {
        body: {
          name: randomString(HALL.NAME.MIN_LENGTH.VALUE + 1),
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
      (err) => {
        assert.strictEqual(err instanceof MRSError, true);
        assert.deepStrictEqual((err as MRSError).getClientError(), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: HALL.ROWS.REQUIRED_ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Create validation: Empty rows', (context) => {
    const { request } = createHttpMocks<ResponseWithContext>({
      logger,
      reqOptions: {
        body: {
          name: randomString(HALL.NAME.MIN_LENGTH.VALUE + 1),
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
      (err) => {
        assert.strictEqual(err instanceof MRSError, true);
        assert.deepStrictEqual((err as MRSError).getClientError(), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: HALL.ROWS.INVALID_TYPE_ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Create validation: Rows number too low', (context) => {
    const { request } = createHttpMocks<ResponseWithContext>({
      logger,
      reqOptions: {
        body: {
          name: randomString(HALL.NAME.MIN_LENGTH.VALUE + 1),
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
      (err) => {
        assert.strictEqual(err instanceof MRSError, true);
        assert.deepStrictEqual((err as MRSError).getClientError(), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: HALL.ROWS.MIN_LENGTH.ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Create validation: Rows number too high', (context) => {
    const { request } = createHttpMocks<ResponseWithContext>({
      logger,
      reqOptions: {
        body: {
          name: randomString(HALL.NAME.MIN_LENGTH.VALUE + 1),
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
      (err) => {
        assert.strictEqual(err instanceof MRSError, true);
        assert.deepStrictEqual((err as MRSError).getClientError(), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: HALL.ROWS.MAX_LENGTH.ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Create validation: Missing columns', (context) => {
    const { request } = createHttpMocks<ResponseWithContext>({
      logger,
      reqOptions: {
        body: {
          name: randomString(HALL.NAME.MIN_LENGTH.VALUE + 1),
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
      (err) => {
        assert.strictEqual(err instanceof MRSError, true);
        assert.deepStrictEqual((err as MRSError).getClientError(), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: HALL.COLUMNS.REQUIRED_ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Create validation: Empty columns', (context) => {
    const { request } = createHttpMocks<ResponseWithContext>({
      logger,
      reqOptions: {
        body: {
          name: randomString(HALL.NAME.MIN_LENGTH.VALUE + 1),
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
      (err) => {
        assert.strictEqual(err instanceof MRSError, true);
        assert.deepStrictEqual((err as MRSError).getClientError(), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: HALL.COLUMNS.INVALID_TYPE_ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Create validation: Columns number too low', (context) => {
    const { request } = createHttpMocks<ResponseWithContext>({
      logger,
      reqOptions: {
        body: {
          name: randomString(HALL.NAME.MIN_LENGTH.VALUE + 1),
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
      (err) => {
        assert.strictEqual(err instanceof MRSError, true);
        assert.deepStrictEqual((err as MRSError).getClientError(), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: HALL.COLUMNS.MIN_LENGTH.ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Create validation: Columns number too high', (context) => {
    const { request } = createHttpMocks<ResponseWithContext>({
      logger,
      reqOptions: {
        body: {
          name: randomString(HALL.NAME.MIN_LENGTH.VALUE + 1),
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
      (err) => {
        assert.strictEqual(err instanceof MRSError, true);
        assert.deepStrictEqual((err as MRSError).getClientError(), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: HALL.COLUMNS.MAX_LENGTH.ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Create service: Duplicate entry', async () => {
    const hallIds: string[] = [];

    const hall = await seedHall(serverParams);
    hallIds.push(hall.id);

    const hallToCreate = {
      name: hall.name,
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
          const duplicateHall = await serviceFunctions.createHall(
            {
              authentication: serverParams.authentication,
              fileManager: serverParams.fileManager,
              database: serverParams.database,
              logger,
            },
            hallToCreate,
          );
          hallIds.push(duplicateHall.id);
        },
        (err) => {
          assert.strictEqual(err instanceof MRSError, true);
          assert.deepStrictEqual((err as MRSError).getClientError(), {
            code: HTTP_STATUS_CODES.CONFLICT,
            message: `Hall '${hall.name}' already exists`,
          });

          return true;
        },
      );
    } finally {
      await deleteHalls(serverParams, ...hallIds);
    }
  });
  await test('Invalid - Update validation: Without updates', (context) => {
    const { request } = createHttpMocks<ResponseWithContext>({
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
      (err) => {
        assert.strictEqual(err instanceof MRSError, true);
        assert.deepStrictEqual((err as MRSError).getClientError(), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: HALL.NO_FIELDS_TO_UPDATE_ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Update validation: Missing id', (context) => {
    const { request } = createHttpMocks<ResponseWithContext>({
      logger,
      reqOptions: {
        body: {
          name: randomString(),
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
      (err) => {
        assert.strictEqual(err instanceof MRSError, true);
        assert.deepStrictEqual((err as MRSError).getClientError(), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: HALL.ID.REQUIRED_ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Update validation: Empty id', (context) => {
    const { request } = createHttpMocks<ResponseWithContext>({
      logger,
      reqOptions: {
        params: {
          hall_id: '',
        },
        body: {
          name: randomString(),
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
      (err) => {
        assert.strictEqual(err instanceof MRSError, true);
        assert.deepStrictEqual((err as MRSError).getClientError(), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: HALL.ID.ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Update validation: Invalid id', (context) => {
    const { request } = createHttpMocks<ResponseWithContext>({
      logger,
      reqOptions: {
        params: {
          hall_id: randomString(),
        },
        body: {
          name: randomString(),
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
      (err) => {
        assert.strictEqual(err instanceof MRSError, true);
        assert.deepStrictEqual((err as MRSError).getClientError(), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: HALL.ID.ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Update validation: Empty name', (context) => {
    const { request } = createHttpMocks<ResponseWithContext>({
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
      (err) => {
        assert.strictEqual(err instanceof MRSError, true);
        assert.deepStrictEqual((err as MRSError).getClientError(), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: HALL.NAME.MIN_LENGTH.ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Update validation: Name too short', (context) => {
    const { request } = createHttpMocks<ResponseWithContext>({
      logger,
      reqOptions: {
        params: {
          hall_id: randomUUID(),
        },
        body: {
          name: randomString(HALL.NAME.MIN_LENGTH.VALUE - 1),
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
      (err) => {
        assert.strictEqual(err instanceof MRSError, true);
        assert.deepStrictEqual((err as MRSError).getClientError(), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: HALL.NAME.MIN_LENGTH.ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Update validation: Name too long', (context) => {
    const { request } = createHttpMocks<ResponseWithContext>({
      logger,
      reqOptions: {
        params: {
          hall_id: randomUUID(),
        },
        body: {
          name: randomString(HALL.NAME.MAX_LENGTH.VALUE + 1),
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
      (err) => {
        assert.strictEqual(err instanceof MRSError, true);
        assert.deepStrictEqual((err as MRSError).getClientError(), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: HALL.NAME.MAX_LENGTH.ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Update validation: Empty rows', (context) => {
    const { request } = createHttpMocks<ResponseWithContext>({
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
      (err) => {
        assert.strictEqual(err instanceof MRSError, true);
        assert.deepStrictEqual((err as MRSError).getClientError(), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: HALL.ROWS.INVALID_TYPE_ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Update validation: Rows number too low', (context) => {
    const { request } = createHttpMocks<ResponseWithContext>({
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
      (err) => {
        assert.strictEqual(err instanceof MRSError, true);
        assert.deepStrictEqual((err as MRSError).getClientError(), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: HALL.ROWS.MIN_LENGTH.ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Update validation: Rows number too high', (context) => {
    const { request } = createHttpMocks<ResponseWithContext>({
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
      (err) => {
        assert.strictEqual(err instanceof MRSError, true);
        assert.deepStrictEqual((err as MRSError).getClientError(), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: HALL.ROWS.MAX_LENGTH.ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Update validation: Empty columns', (context) => {
    const { request } = createHttpMocks<ResponseWithContext>({
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
      (err) => {
        assert.strictEqual(err instanceof MRSError, true);
        assert.deepStrictEqual((err as MRSError).getClientError(), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: HALL.COLUMNS.INVALID_TYPE_ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Update validation: Columns number too low', (context) => {
    const { request } = createHttpMocks<ResponseWithContext>({
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
      (err) => {
        assert.strictEqual(err instanceof MRSError, true);
        assert.deepStrictEqual((err as MRSError).getClientError(), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: HALL.COLUMNS.MIN_LENGTH.ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Update validation: Columns number too high', (context) => {
    const { request } = createHttpMocks<ResponseWithContext>({
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
      (err) => {
        assert.strictEqual(err instanceof MRSError, true);
        assert.deepStrictEqual((err as MRSError).getClientError(), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: HALL.COLUMNS.MAX_LENGTH.ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Update service: Duplicate entry', async () => {
    const hallIds: string[] = [];
    const halls = await seedHalls(serverParams, 2);
    hallIds.push(
      ...halls.map(({ id }) => {
        return id;
      }),
    );

    const hallToUpdate = {
      hallId: halls[0]!.id,
      name: halls[1]!.name,
    };

    try {
      await assert.rejects(
        async () => {
          await serviceFunctions.updateHall(
            {
              authentication: serverParams.authentication,
              fileManager: serverParams.fileManager,
              database: serverParams.database,
              logger,
            },
            hallToUpdate,
          );
        },
        (err) => {
          assert.strictEqual(err instanceof MRSError, true);
          assert.deepStrictEqual((err as MRSError).getClientError(), {
            code: HTTP_STATUS_CODES.CONFLICT,
            message: `Hall '${halls[1]!.name}' already exists`,
          });

          return true;
        },
      );
    } finally {
      await deleteHalls(serverParams, ...hallIds);
    }
  });
  await test('Invalid - Delete validation: Missing id', (context) => {
    const { request } = createHttpMocks<ResponseWithContext>({
      logger,
    });

    const validateDeleteHallSpy = context.mock.fn(
      validationFunctions.validateDeleteHall,
    );

    assert.throws(
      () => {
        validateDeleteHallSpy(request);
      },
      (err) => {
        assert.strictEqual(err instanceof MRSError, true);
        assert.deepStrictEqual((err as MRSError).getClientError(), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: HALL.ID.REQUIRED_ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Delete validation: Empty id', (context) => {
    const { request } = createHttpMocks<ResponseWithContext>({
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
      (err) => {
        assert.strictEqual(err instanceof MRSError, true);
        assert.deepStrictEqual((err as MRSError).getClientError(), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: HALL.ID.ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Delete validation: Invalid id', (context) => {
    const { request } = createHttpMocks<ResponseWithContext>({
      logger,
      reqOptions: {
        params: {
          hall_id: randomString(),
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
      (err) => {
        assert.strictEqual(err instanceof MRSError, true);
        assert.deepStrictEqual((err as MRSError).getClientError(), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: HALL.ID.ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
});
