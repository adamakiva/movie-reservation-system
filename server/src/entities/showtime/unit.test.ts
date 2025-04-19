import {
  after,
  assert,
  before,
  createHttpMocks,
  GeneralError,
  generateShowtimesData,
  HTTP_STATUS_CODES,
  initServer,
  randomAlphaNumericString,
  randomUUID,
  SHOWTIME,
  suite,
  terminateServer,
  test,
  VALIDATION,
  type ResponseWithContext,
  type ServerParams,
} from '../../tests/utils.ts';

import * as validationFunctions from './validator.ts';

/**********************************************************************************/

const { PAGINATION } = VALIDATION;

/**********************************************************************************/

await suite('Showtime unit tests', async () => {
  let logger: ServerParams['logger'] = null!;
  let server: ServerParams['server'] = null!;
  let database: ServerParams['database'] = null!;
  before(async () => {
    ({ server, database, logger } = await initServer());
  });
  after(async () => {
    await terminateServer(server, database);
  });

  await test('Invalid - Read multiple validation: Empty movie id', (context) => {
    const { request, response } = createHttpMocks<ResponseWithContext>({
      logger,
      reqOptions: {
        query: {
          'movie-id': '',
        },
      },
    });

    const validateGetShowtimesSpy = context.mock.fn(
      validationFunctions.validateGetShowtimes,
    );

    assert.throws(
      () => {
        validateGetShowtimesSpy(request);
      },
      (error: GeneralError) => {
        assert.strictEqual(error instanceof GeneralError, true);
        assert.deepStrictEqual(error.getClientError(response), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: SHOWTIME.MOVIE_ID.ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Read multiple validation: Invalid movie id', (context) => {
    const { request, response } = createHttpMocks<ResponseWithContext>({
      logger,
      reqOptions: {
        query: {
          'movie-id': randomAlphaNumericString(),
        },
      },
    });

    const validateGetShowtimesSpy = context.mock.fn(
      validationFunctions.validateGetShowtimes,
    );

    assert.throws(
      () => {
        validateGetShowtimesSpy(request);
      },
      (error: GeneralError) => {
        assert.strictEqual(error instanceof GeneralError, true);
        assert.deepStrictEqual(error.getClientError(response), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: SHOWTIME.MOVIE_ID.ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Read multiple validation: Empty hall id', (context) => {
    const { request, response } = createHttpMocks<ResponseWithContext>({
      logger,
      reqOptions: {
        query: {
          'hall-id': '',
        },
      },
    });

    const validateGetShowtimesSpy = context.mock.fn(
      validationFunctions.validateGetShowtimes,
    );

    assert.throws(
      () => {
        validateGetShowtimesSpy(request);
      },
      (error: GeneralError) => {
        assert.strictEqual(error instanceof GeneralError, true);
        assert.deepStrictEqual(error.getClientError(response), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: SHOWTIME.HALL_ID.ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Read multiple validation: Invalid hall id', (context) => {
    const { request, response } = createHttpMocks<ResponseWithContext>({
      logger,
      reqOptions: {
        query: {
          'hall-id': randomAlphaNumericString(),
        },
      },
    });

    const validateGetShowtimesSpy = context.mock.fn(
      validationFunctions.validateGetShowtimes,
    );

    assert.throws(
      () => {
        validateGetShowtimesSpy(request);
      },
      (error: GeneralError) => {
        assert.strictEqual(error instanceof GeneralError, true);
        assert.deepStrictEqual(error.getClientError(response), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: SHOWTIME.HALL_ID.ERROR_MESSAGE,
        });

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

    const validateGetShowtimesSpy = context.mock.fn(
      validationFunctions.validateGetShowtimes,
    );

    assert.throws(
      () => {
        validateGetShowtimesSpy(request);
      },
      (error: GeneralError) => {
        assert.strictEqual(error instanceof GeneralError, true);
        assert.deepStrictEqual(error.getClientError(response), {
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

    const validateGetShowtimesSpy = context.mock.fn(
      validationFunctions.validateGetShowtimes,
    );

    assert.throws(
      () => {
        validateGetShowtimesSpy(request);
      },
      (error: GeneralError) => {
        assert.strictEqual(error instanceof GeneralError, true);
        assert.deepStrictEqual(error.getClientError(response), {
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

    const validateGetShowtimesSpy = context.mock.fn(
      validationFunctions.validateGetShowtimes,
    );

    assert.throws(
      () => {
        validateGetShowtimesSpy(request);
      },
      (error: GeneralError) => {
        assert.strictEqual(error instanceof GeneralError, true);
        assert.deepStrictEqual(error.getClientError(response), {
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

    const validateGetShowtimesSpy = context.mock.fn(
      validationFunctions.validateGetShowtimes,
    );

    assert.throws(
      () => {
        validateGetShowtimesSpy(request);
      },
      (error: GeneralError) => {
        assert.strictEqual(error instanceof GeneralError, true);
        assert.deepStrictEqual(error.getClientError(response), {
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

    const validateGetShowtimesSpy = context.mock.fn(
      validationFunctions.validateGetShowtimes,
    );

    assert.throws(
      () => {
        validateGetShowtimesSpy(request);
      },
      (error: GeneralError) => {
        assert.strictEqual(error instanceof GeneralError, true);
        assert.deepStrictEqual(error.getClientError(response), {
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

    const validateGetShowtimesSpy = context.mock.fn(
      validationFunctions.validateGetShowtimes,
    );

    assert.throws(
      () => {
        validateGetShowtimesSpy(request);
      },
      (error: GeneralError) => {
        assert.strictEqual(error instanceof GeneralError, true);
        assert.deepStrictEqual(error.getClientError(response), {
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

    const validateGetShowtimesSpy = context.mock.fn(
      validationFunctions.validateGetShowtimes,
    );

    assert.throws(
      () => {
        validateGetShowtimesSpy(request);
      },
      (error: GeneralError) => {
        assert.strictEqual(error instanceof GeneralError, true);
        assert.deepStrictEqual(error.getClientError(response), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: PAGINATION.PAGE_SIZE.INVALID_TYPE_ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Create validation: Missing at', (context) => {
    const { request, response } = createHttpMocks<ResponseWithContext>({
      logger,
      reqOptions: {
        body: {
          movieId: randomUUID(),
          hallId: randomUUID(),
        },
      },
    });

    const validateCreateShowtimeSpy = context.mock.fn(
      validationFunctions.validateCreateShowtime,
    );

    assert.throws(
      () => {
        validateCreateShowtimeSpy(request);
      },
      (error: GeneralError) => {
        assert.strictEqual(error instanceof GeneralError, true);
        assert.deepStrictEqual(error.getClientError(response), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: SHOWTIME.AT.INVALID_TYPE_ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Create validation: Empty at', (context) => {
    const { request, response } = createHttpMocks<ResponseWithContext>({
      logger,
      reqOptions: {
        body: {
          at: '',
          movieId: randomUUID(),
          hallId: randomUUID(),
        },
      },
    });

    const validateCreateShowtimeSpy = context.mock.fn(
      validationFunctions.validateCreateShowtime,
    );

    assert.throws(
      () => {
        validateCreateShowtimeSpy(request);
      },
      (error: GeneralError) => {
        assert.strictEqual(error instanceof GeneralError, true);
        assert.deepStrictEqual(error.getClientError(response), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: SHOWTIME.AT.INVALID_TYPE_ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Create validation: At in the past', (context) => {
    const { request, response } = createHttpMocks<ResponseWithContext>({
      logger,
      reqOptions: {
        body: {
          at: new Date(SHOWTIME.AT.MIN_VALUE.VALUE() - 86_400_000),
          movieId: randomUUID(),
          hallId: randomUUID(),
        },
      },
    });

    const validateCreateShowtimeSpy = context.mock.fn(
      validationFunctions.validateCreateShowtime,
    );

    assert.throws(
      () => {
        validateCreateShowtimeSpy(request);
      },
      (error: GeneralError) => {
        assert.strictEqual(error instanceof GeneralError, true);
        assert.deepStrictEqual(error.getClientError(response), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: SHOWTIME.AT.MIN_VALUE.ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Create validation: Invalid at', (context) => {
    const { request, response } = createHttpMocks<ResponseWithContext>({
      logger,
      reqOptions: {
        body: {
          at: randomAlphaNumericString(),
          movieId: randomUUID(),
          hallId: randomUUID(),
        },
      },
    });

    const validateCreateShowtimeSpy = context.mock.fn(
      validationFunctions.validateCreateShowtime,
    );

    assert.throws(
      () => {
        validateCreateShowtimeSpy(request);
      },
      (error: GeneralError) => {
        assert.strictEqual(error instanceof GeneralError, true);
        assert.deepStrictEqual(error.getClientError(response), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: SHOWTIME.AT.INVALID_TYPE_ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Create validation: Missing movie id', (context) => {
    const { request, response } = createHttpMocks<ResponseWithContext>({
      logger,
      reqOptions: {
        body: {
          ...generateShowtimesData()[0],
          hallId: randomUUID(),
        },
      },
    });

    const validateCreateShowtimeSpy = context.mock.fn(
      validationFunctions.validateCreateShowtime,
    );

    assert.throws(
      () => {
        validateCreateShowtimeSpy(request);
      },
      (error: GeneralError) => {
        assert.strictEqual(error instanceof GeneralError, true);
        assert.deepStrictEqual(error.getClientError(response), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: SHOWTIME.MOVIE_ID.REQUIRED_ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Create validation: Empty movie id', (context) => {
    const { request, response } = createHttpMocks<ResponseWithContext>({
      logger,
      reqOptions: {
        body: {
          ...generateShowtimesData()[0],
          movieId: '',
          hallId: randomUUID(),
        },
      },
    });

    const validateCreateShowtimeSpy = context.mock.fn(
      validationFunctions.validateCreateShowtime,
    );

    assert.throws(
      () => {
        validateCreateShowtimeSpy(request);
      },
      (error: GeneralError) => {
        assert.strictEqual(error instanceof GeneralError, true);
        assert.deepStrictEqual(error.getClientError(response), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: SHOWTIME.MOVIE_ID.ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Create validation: Invalid movie id', (context) => {
    const { request, response } = createHttpMocks<ResponseWithContext>({
      logger,
      reqOptions: {
        body: {
          ...generateShowtimesData()[0],
          movieId: randomAlphaNumericString(),
          hallId: randomUUID(),
        },
      },
    });

    const validateCreateShowtimeSpy = context.mock.fn(
      validationFunctions.validateCreateShowtime,
    );

    assert.throws(
      () => {
        validateCreateShowtimeSpy(request);
      },
      (error: GeneralError) => {
        assert.strictEqual(error instanceof GeneralError, true);
        assert.deepStrictEqual(error.getClientError(response), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: SHOWTIME.MOVIE_ID.ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Create validation: Missing hall id', (context) => {
    const { request, response } = createHttpMocks<ResponseWithContext>({
      logger,
      reqOptions: {
        body: {
          ...generateShowtimesData()[0],
          movieId: randomUUID(),
        },
      },
    });

    const validateCreateShowtimeSpy = context.mock.fn(
      validationFunctions.validateCreateShowtime,
    );

    assert.throws(
      () => {
        validateCreateShowtimeSpy(request);
      },
      (error: GeneralError) => {
        assert.strictEqual(error instanceof GeneralError, true);
        assert.deepStrictEqual(error.getClientError(response), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: SHOWTIME.HALL_ID.REQUIRED_ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Create validation: Empty hall id', (context) => {
    const { request, response } = createHttpMocks<ResponseWithContext>({
      logger,
      reqOptions: {
        body: {
          ...generateShowtimesData()[0],
          movieId: randomUUID(),
          hallId: '',
        },
      },
    });

    const validateCreateShowtimeSpy = context.mock.fn(
      validationFunctions.validateCreateShowtime,
    );

    assert.throws(
      () => {
        validateCreateShowtimeSpy(request);
      },
      (error: GeneralError) => {
        assert.strictEqual(error instanceof GeneralError, true);
        assert.deepStrictEqual(error.getClientError(response), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: SHOWTIME.HALL_ID.ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Create validation: Invalid hall id', (context) => {
    const { request, response } = createHttpMocks<ResponseWithContext>({
      logger,
      reqOptions: {
        body: {
          ...generateShowtimesData()[0],
          movieId: randomUUID(),
          hallId: randomAlphaNumericString(),
        },
      },
    });

    const validateCreateShowtimeSpy = context.mock.fn(
      validationFunctions.validateCreateShowtime,
    );

    assert.throws(
      () => {
        validateCreateShowtimeSpy(request);
      },
      (error: GeneralError) => {
        assert.strictEqual(error instanceof GeneralError, true);
        assert.deepStrictEqual(error.getClientError(response), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: SHOWTIME.HALL_ID.ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Delete validation: Missing id', (context) => {
    const { request, response } = createHttpMocks<ResponseWithContext>({
      logger,
    });

    const validateDeleteShowtimeSpy = context.mock.fn(
      validationFunctions.validateDeleteShowtime,
    );

    assert.throws(
      () => {
        validateDeleteShowtimeSpy(request);
      },
      (error: GeneralError) => {
        assert.strictEqual(error instanceof GeneralError, true);
        assert.deepStrictEqual(error.getClientError(response), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: SHOWTIME.ID.REQUIRED_ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Delete validation: Empty id', (context) => {
    const { request, response } = createHttpMocks<ResponseWithContext>({
      logger,
      reqOptions: { params: { showtime_id: '' } },
    });

    const validateDeleteShowtimeSpy = context.mock.fn(
      validationFunctions.validateDeleteShowtime,
    );

    assert.throws(
      () => {
        validateDeleteShowtimeSpy(request);
      },
      (error: GeneralError) => {
        assert.strictEqual(error instanceof GeneralError, true);
        assert.deepStrictEqual(error.getClientError(response), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: SHOWTIME.ID.ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Delete validation: Invalid id', (context) => {
    const { request, response } = createHttpMocks<ResponseWithContext>({
      logger,
      reqOptions: { params: { showtime_id: randomAlphaNumericString() } },
    });

    const validateDeleteShowtimeSpy = context.mock.fn(
      validationFunctions.validateDeleteShowtime,
    );

    assert.throws(
      () => {
        validateDeleteShowtimeSpy(request);
      },
      (error: GeneralError) => {
        assert.strictEqual(error instanceof GeneralError, true);
        assert.deepStrictEqual(error.getClientError(response), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: SHOWTIME.ID.ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
});
