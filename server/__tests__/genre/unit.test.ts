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
  type LoggerHandler,
  type ResponseWithContext,
  type ServerParams,
} from '../utils.ts';

import {
  seedGenre,
  seedGenres,
  serviceFunctions,
  validationFunctions,
} from './utils.ts';

/**********************************************************************************/

const { GENRE } = VALIDATION;

/**********************************************************************************/

await suite('Genre unit tests', async () => {
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
    });

    const validateCreateGenreSpy = context.mock.fn(
      validationFunctions.validateCreateGenre,
    );

    assert.throws(
      () => {
        validateCreateGenreSpy(request);
      },
      (err: GeneralError) => {
        assert.strictEqual(err instanceof GeneralError, true);
        assert.deepStrictEqual(err.getClientError(response), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: GENRE.NAME.REQUIRED_ERROR_MESSAGE,
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
        },
      },
    });

    const validateCreateGenreSpy = context.mock.fn(
      validationFunctions.validateCreateGenre,
    );

    assert.throws(
      () => {
        validateCreateGenreSpy(request);
      },
      (err: GeneralError) => {
        assert.strictEqual(err instanceof GeneralError, true);
        assert.deepStrictEqual(err.getClientError(response), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: GENRE.NAME.MIN_LENGTH.ERROR_MESSAGE,
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
          name: randomAlphaNumericString(GENRE.NAME.MIN_LENGTH.VALUE - 1),
        },
      },
    });

    const validateCreateGenreSpy = context.mock.fn(
      validationFunctions.validateCreateGenre,
    );

    assert.throws(
      () => {
        validateCreateGenreSpy(request);
      },
      (err: GeneralError) => {
        assert.strictEqual(err instanceof GeneralError, true);
        assert.deepStrictEqual(err.getClientError(response), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: GENRE.NAME.MIN_LENGTH.ERROR_MESSAGE,
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
          name: randomAlphaNumericString(GENRE.NAME.MAX_LENGTH.VALUE + 1),
        },
      },
    });

    const validateCreateGenreSpy = context.mock.fn(
      validationFunctions.validateCreateGenre,
    );

    assert.throws(
      () => {
        validateCreateGenreSpy(request);
      },
      (err: GeneralError) => {
        assert.strictEqual(err instanceof GeneralError, true);
        assert.deepStrictEqual(err.getClientError(response), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: GENRE.NAME.MAX_LENGTH.ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Create service: Duplicate entry', async () => {
    const { response } = createHttpMocks<ResponseWithContext>({ logger });
    const { name: genreName } = await seedGenre(serverParams);

    const genreToCreate = { name: genreName };

    try {
      await assert.rejects(
        async () => {
          // In case the function does not throw, we want to clean the created entry
          await serviceFunctions.createGenre(
            {
              authentication: serverParams.authentication,
              fileManager: serverParams.fileManager,
              database: serverParams.database,
              logger,
            },
            genreToCreate,
          );
        },
        (err: GeneralError) => {
          assert.strictEqual(err instanceof GeneralError, true);
          assert.deepStrictEqual(err.getClientError(response), {
            code: HTTP_STATUS_CODES.CONFLICT,
            message: `Genre '${genreName}' already exists`,
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
          genre_id: randomUUID(),
        },
      },
    });

    const validateUpdateGenreSpy = context.mock.fn(
      validationFunctions.validateUpdateGenre,
    );

    assert.throws(
      () => {
        validateUpdateGenreSpy(request);
      },
      (err: GeneralError) => {
        assert.strictEqual(err instanceof GeneralError, true);
        assert.deepStrictEqual(err.getClientError(response), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: GENRE.NO_FIELDS_TO_UPDATE_ERROR_MESSAGE,
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
          name: randomAlphaNumericString(GENRE.NAME.MIN_LENGTH.VALUE + 1),
        },
      },
    });

    const validateUpdateGenreSpy = context.mock.fn(
      validationFunctions.validateUpdateGenre,
    );

    assert.throws(
      () => {
        validateUpdateGenreSpy(request);
      },
      (err: GeneralError) => {
        assert.strictEqual(err instanceof GeneralError, true);
        assert.deepStrictEqual(err.getClientError(response), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: GENRE.ID.REQUIRED_ERROR_MESSAGE,
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
          genre_id: '',
        },
        body: {
          name: randomAlphaNumericString(GENRE.NAME.MIN_LENGTH.VALUE + 1),
        },
      },
    });

    const validateUpdateGenreSpy = context.mock.fn(
      validationFunctions.validateUpdateGenre,
    );

    assert.throws(
      () => {
        validateUpdateGenreSpy(request);
      },
      (err: GeneralError) => {
        assert.strictEqual(err instanceof GeneralError, true);
        assert.deepStrictEqual(err.getClientError(response), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: GENRE.ID.ERROR_MESSAGE,
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
          genre_id: randomAlphaNumericString(),
        },
        body: {
          name: randomAlphaNumericString(GENRE.NAME.MIN_LENGTH.VALUE + 1),
        },
      },
    });

    const validateUpdateGenreSpy = context.mock.fn(
      validationFunctions.validateUpdateGenre,
    );

    assert.throws(
      () => {
        validateUpdateGenreSpy(request);
      },
      (err: GeneralError) => {
        assert.strictEqual(err instanceof GeneralError, true);
        assert.deepStrictEqual(err.getClientError(response), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: GENRE.ID.ERROR_MESSAGE,
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
          genre_id: randomUUID(),
        },
        body: {
          name: '',
        },
      },
    });

    const validateUpdateGenreSpy = context.mock.fn(
      validationFunctions.validateUpdateGenre,
    );

    assert.throws(
      () => {
        validateUpdateGenreSpy(request);
      },
      (err: GeneralError) => {
        assert.strictEqual(err instanceof GeneralError, true);
        assert.deepStrictEqual(err.getClientError(response), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: GENRE.NAME.MIN_LENGTH.ERROR_MESSAGE,
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
          genre_id: randomUUID(),
        },
        body: {
          name: randomAlphaNumericString(GENRE.NAME.MIN_LENGTH.VALUE - 1),
        },
      },
    });

    const validateUpdateGenreSpy = context.mock.fn(
      validationFunctions.validateUpdateGenre,
    );

    assert.throws(
      () => {
        validateUpdateGenreSpy(request);
      },
      (err: GeneralError) => {
        assert.strictEqual(err instanceof GeneralError, true);
        assert.deepStrictEqual(err.getClientError(response), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: GENRE.NAME.MIN_LENGTH.ERROR_MESSAGE,
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
          genre_id: randomUUID(),
        },
        body: {
          name: randomAlphaNumericString(GENRE.NAME.MAX_LENGTH.VALUE + 1),
        },
      },
    });

    const validateUpdateGenreSpy = context.mock.fn(
      validationFunctions.validateUpdateGenre,
    );

    assert.throws(
      () => {
        validateUpdateGenreSpy(request);
      },
      (err: GeneralError) => {
        assert.strictEqual(err instanceof GeneralError, true);
        assert.deepStrictEqual(err.getClientError(response), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: GENRE.NAME.MAX_LENGTH.ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Update service: Duplicate entry', async () => {
    const { response } = createHttpMocks<ResponseWithContext>({ logger });
    const createdGenres = await seedGenres(serverParams, 2);

    const genreToUpdate = {
      genreId: createdGenres[0]!.id,
      name: createdGenres[1]!.name,
    };

    try {
      await assert.rejects(
        async () => {
          await serviceFunctions.updateGenre(
            {
              authentication: serverParams.authentication,
              fileManager: serverParams.fileManager,
              database: serverParams.database,
              logger,
            },
            genreToUpdate,
          );
        },
        (err: GeneralError) => {
          assert.strictEqual(err instanceof GeneralError, true);
          assert.deepStrictEqual(err.getClientError(response), {
            code: HTTP_STATUS_CODES.CONFLICT,
            message: `Genre '${createdGenres[1]!.name}' already exists`,
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

    const validateDeleteGenreSpy = context.mock.fn(
      validationFunctions.validateDeleteGenre,
    );

    assert.throws(
      () => {
        validateDeleteGenreSpy(request);
      },
      (err: GeneralError) => {
        assert.strictEqual(err instanceof GeneralError, true);
        assert.deepStrictEqual(err.getClientError(response), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: GENRE.ID.REQUIRED_ERROR_MESSAGE,
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
          genre_id: '',
        },
      },
    });

    const validateDeleteGenreSpy = context.mock.fn(
      validationFunctions.validateDeleteGenre,
    );

    assert.throws(
      () => {
        validateDeleteGenreSpy(request);
      },
      (err: GeneralError) => {
        assert.strictEqual(err instanceof GeneralError, true);
        assert.deepStrictEqual(err.getClientError(response), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: GENRE.ID.ERROR_MESSAGE,
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
          genre_id: randomAlphaNumericString(),
        },
      },
    });

    const validateDeleteGenreSpy = context.mock.fn(
      validationFunctions.validateDeleteGenre,
    );

    assert.throws(
      () => {
        validateDeleteGenreSpy(request);
      },
      (err: GeneralError) => {
        assert.strictEqual(err instanceof GeneralError, true);
        assert.deepStrictEqual(err.getClientError(response), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: GENRE.ID.ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
});
