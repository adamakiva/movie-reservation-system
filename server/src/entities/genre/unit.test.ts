import {
  after,
  assert,
  before,
  clearDatabase,
  createHttpMocks,
  GeneralError,
  GENRE,
  HTTP_STATUS_CODES,
  initServer,
  randomAlphaNumericString,
  randomUUID,
  seedGenre,
  seedGenres,
  suite,
  terminateServer,
  test,
  type ServerParams,
} from '../../tests/utils.ts';

import * as serviceFunctions from './service/index.ts';
import * as validationFunctions from './validator.ts';

/**********************************************************************************/

await suite('Genre unit tests', async () => {
  let logger: ServerParams['logger'] = null!;
  let server: ServerParams['server'] = null!;
  let authentication: ServerParams['authentication'] = null!;
  let fileManager: ServerParams['fileManager'] = null!;
  let database: ServerParams['database'] = null!;
  let messageQueue: ServerParams['messageQueue'] = null!;
  before(async () => {
    ({ server, fileManager, authentication, database, messageQueue, logger } =
      await initServer());
  });
  after(async () => {
    await terminateServer(server, database);
  });

  await test('Invalid - Create validation: Missing name', (context) => {
    const { request, response } = createHttpMocks({
      logger,
    });

    const validateCreateGenreSpy = context.mock.fn(
      validationFunctions.validateCreateGenre,
    );

    assert.throws(
      () => {
        validateCreateGenreSpy(request);
      },
      (error: GeneralError) => {
        assert.strictEqual(error instanceof GeneralError, true);
        assert.deepStrictEqual(error.getClientError(response), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: GENRE.NAME.REQUIRED_ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Create validation: Empty name', (context) => {
    const { request, response } = createHttpMocks({
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
      (error: GeneralError) => {
        assert.strictEqual(error instanceof GeneralError, true);
        assert.deepStrictEqual(error.getClientError(response), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: GENRE.NAME.MIN_LENGTH.ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Create validation: Name too short', (context) => {
    const { request, response } = createHttpMocks({
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
      (error: GeneralError) => {
        assert.strictEqual(error instanceof GeneralError, true);
        assert.deepStrictEqual(error.getClientError(response), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: GENRE.NAME.MIN_LENGTH.ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Create validation: Name too long', (context) => {
    const { request, response } = createHttpMocks({
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
      (error: GeneralError) => {
        assert.strictEqual(error instanceof GeneralError, true);
        assert.deepStrictEqual(error.getClientError(response), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: GENRE.NAME.MAX_LENGTH.ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Create service: Duplicate entry', async () => {
    const { response } = createHttpMocks({ logger });
    const { name: genreName } = await seedGenre(database);

    const genreToCreate = { name: genreName };

    try {
      await assert.rejects(
        async () => {
          // In case the function does not throw, we want to clean the created entry
          await serviceFunctions.createGenre(
            {
              authentication,
              database,
              fileManager,
              messageQueue,
              logger,
            },
            genreToCreate,
          );
        },
        (error: GeneralError) => {
          assert.strictEqual(error instanceof GeneralError, true);
          assert.deepStrictEqual(error.getClientError(response), {
            code: HTTP_STATUS_CODES.CONFLICT,
            message: `Genre '${genreName}' already exists`,
          });

          return true;
        },
      );
    } finally {
      await clearDatabase(database);
    }
  });
  await test('Invalid - Update validation: Without updates', (context) => {
    const { request, response } = createHttpMocks({
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
      (error: GeneralError) => {
        assert.strictEqual(error instanceof GeneralError, true);
        assert.deepStrictEqual(error.getClientError(response), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: GENRE.NO_FIELDS_TO_UPDATE_ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Update validation: Missing id', (context) => {
    const { request, response } = createHttpMocks({
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
      (error: GeneralError) => {
        assert.strictEqual(error instanceof GeneralError, true);
        assert.deepStrictEqual(error.getClientError(response), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: GENRE.ID.REQUIRED_ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Update validation: Empty id', (context) => {
    const { request, response } = createHttpMocks({
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
      (error: GeneralError) => {
        assert.strictEqual(error instanceof GeneralError, true);
        assert.deepStrictEqual(error.getClientError(response), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: GENRE.ID.ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Update validation: Invalid id', (context) => {
    const { request, response } = createHttpMocks({
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
      (error: GeneralError) => {
        assert.strictEqual(error instanceof GeneralError, true);
        assert.deepStrictEqual(error.getClientError(response), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: GENRE.ID.ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Update validation: Empty name', (context) => {
    const { request, response } = createHttpMocks({
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
      (error: GeneralError) => {
        assert.strictEqual(error instanceof GeneralError, true);
        assert.deepStrictEqual(error.getClientError(response), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: GENRE.NAME.MIN_LENGTH.ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Update validation: Name too short', (context) => {
    const { request, response } = createHttpMocks({
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
      (error: GeneralError) => {
        assert.strictEqual(error instanceof GeneralError, true);
        assert.deepStrictEqual(error.getClientError(response), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: GENRE.NAME.MIN_LENGTH.ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Update validation: Name too long', (context) => {
    const { request, response } = createHttpMocks({
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
      (error: GeneralError) => {
        assert.strictEqual(error instanceof GeneralError, true);
        assert.deepStrictEqual(error.getClientError(response), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: GENRE.NAME.MAX_LENGTH.ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Update service: Duplicate entry', async () => {
    const { response } = createHttpMocks({ logger });
    const createdGenres = await seedGenres(database, 2);

    const genreToUpdate = {
      genreId: createdGenres[0]!.id,
      name: createdGenres[1]!.name,
    };

    try {
      await assert.rejects(
        async () => {
          await serviceFunctions.updateGenre(
            {
              authentication,
              database,
              fileManager,
              messageQueue,
              logger,
            },
            genreToUpdate,
          );
        },
        (error: GeneralError) => {
          assert.strictEqual(error instanceof GeneralError, true);
          assert.deepStrictEqual(error.getClientError(response), {
            code: HTTP_STATUS_CODES.CONFLICT,
            message: `Genre '${createdGenres[1]!.name}' already exists`,
          });

          return true;
        },
      );
    } finally {
      await clearDatabase(database);
    }
  });
  await test('Invalid - Delete validation: Missing id', (context) => {
    const { request, response } = createHttpMocks({
      logger,
    });

    const validateDeleteGenreSpy = context.mock.fn(
      validationFunctions.validateDeleteGenre,
    );

    assert.throws(
      () => {
        validateDeleteGenreSpy(request);
      },
      (error: GeneralError) => {
        assert.strictEqual(error instanceof GeneralError, true);
        assert.deepStrictEqual(error.getClientError(response), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: GENRE.ID.REQUIRED_ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Delete validation: Empty id', (context) => {
    const { request, response } = createHttpMocks({
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
      (error: GeneralError) => {
        assert.strictEqual(error instanceof GeneralError, true);
        assert.deepStrictEqual(error.getClientError(response), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: GENRE.ID.ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Delete validation: Invalid id', (context) => {
    const { request, response } = createHttpMocks({
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
      (error: GeneralError) => {
        assert.strictEqual(error instanceof GeneralError, true);
        assert.deepStrictEqual(error.getClientError(response), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: GENRE.ID.ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
});
