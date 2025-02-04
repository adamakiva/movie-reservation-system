import {
  after,
  assert,
  before,
  clearDatabase,
  createHttpMocks,
  GeneralError,
  HTTP_STATUS_CODES,
  initServer,
  type LoggerHandler,
  mockLogger,
  randomAlphaNumericString,
  randomUUID,
  type ResponseWithContext,
  type ServerParams,
  suite,
  terminateServer,
  test,
  VALIDATION,
} from '../utils.ts';

import {
  generateMovieDataIncludingPoster,
  seedMovie,
  serviceFunctions,
  validationFunctions,
} from './utils.ts';

/**********************************************************************************/

const { MOVIE, PAGINATION } = VALIDATION;

/**********************************************************************************/

await suite('Movie unit tests', async () => {
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
    const { request, response } = createHttpMocks<ResponseWithContext>({
      logger,
    });

    const validateGetMovieSpy = context.mock.fn(
      validationFunctions.validateGetMovie,
    );

    assert.throws(
      () => {
        validateGetMovieSpy(request);
      },
      (err: GeneralError) => {
        assert.strictEqual(err instanceof GeneralError, true);
        assert.deepStrictEqual(err.getClientError(response), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: MOVIE.ID.REQUIRED_ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Read single validation: Empty id', (context) => {
    const { request, response } = createHttpMocks<ResponseWithContext>({
      logger,
      reqOptions: {
        params: { movie_id: '' },
      },
    });

    const validateGetMovieSpy = context.mock.fn(
      validationFunctions.validateGetMovie,
    );

    assert.throws(
      () => {
        validateGetMovieSpy(request);
      },
      (err: GeneralError) => {
        assert.strictEqual(err instanceof GeneralError, true);
        assert.deepStrictEqual(err.getClientError(response), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: MOVIE.ID.ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Read single validation: Invalid id', (context) => {
    const { request, response } = createHttpMocks<ResponseWithContext>({
      logger,
      reqOptions: {
        params: { movie_id: randomAlphaNumericString() },
      },
    });

    const validateGetMovieSpy = context.mock.fn(
      validationFunctions.validateGetMovie,
    );

    assert.throws(
      () => {
        validateGetMovieSpy(request);
      },
      (err: GeneralError) => {
        assert.strictEqual(err instanceof GeneralError, true);
        assert.deepStrictEqual(err.getClientError(response), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: MOVIE.ID.ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Read single service: Non-existent entry', async (context) => {
    const { authentication, fileManager, database } = serverParams;
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
    const getMovieSpy = context.mock.fn(serviceFunctions.getMovie);

    await assert.rejects(
      async () => {
        await getMovieSpy(
          {
            authentication,
            database,
            fileManager,
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

    const validateGetMoviesSpy = context.mock.fn(
      validationFunctions.validateGetMovies,
    );

    assert.throws(
      () => {
        validateGetMoviesSpy(request);
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

    const validateGetMoviesSpy = context.mock.fn(
      validationFunctions.validateGetMovies,
    );

    assert.throws(
      () => {
        validateGetMoviesSpy(request);
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

    const validateGetMoviesSpy = context.mock.fn(
      validationFunctions.validateGetMovies,
    );

    assert.throws(
      () => {
        validateGetMoviesSpy(request);
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

    const validateGetMoviesSpy = context.mock.fn(
      validationFunctions.validateGetMovies,
    );

    assert.throws(
      () => {
        validateGetMoviesSpy(request);
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

    const validateGetMoviesSpy = context.mock.fn(
      validationFunctions.validateGetMovies,
    );

    assert.throws(
      () => {
        validateGetMoviesSpy(request);
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

    const validateGetMoviesSpy = context.mock.fn(
      validationFunctions.validateGetMovies,
    );

    assert.throws(
      () => {
        validateGetMoviesSpy(request);
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

    const validateGetMoviesSpy = context.mock.fn(
      validationFunctions.validateGetMovies,
    );

    assert.throws(
      () => {
        validateGetMoviesSpy(request);
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
  await test('Invalid - Create validation: Missing title', async (context) => {
    const { poster, ...movieData } =
      await generateMovieDataIncludingPoster(randomUUID());
    const { request, response } = createHttpMocks<ResponseWithContext>({
      logger,
      reqOptions: {
        body: {
          ...movieData,
          title: undefined,
        },
        file: poster,
      },
    });

    const validateCreateMovieSpy = context.mock.fn(
      validationFunctions.validateCreateMovie,
    );

    assert.throws(
      () => {
        validateCreateMovieSpy(request);
      },
      (err: GeneralError) => {
        assert.strictEqual(err instanceof GeneralError, true);
        assert.deepStrictEqual(err.getClientError(response), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: MOVIE.TITLE.REQUIRED_ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Create validation: Empty title', async (context) => {
    const { poster, ...movieData } =
      await generateMovieDataIncludingPoster(randomUUID());
    const { request, response } = createHttpMocks<ResponseWithContext>({
      logger,
      reqOptions: {
        body: {
          ...movieData,
          title: '',
        },
        file: poster,
      },
    });

    const validateCreateMovieSpy = context.mock.fn(
      validationFunctions.validateCreateMovie,
    );

    assert.throws(
      () => {
        validateCreateMovieSpy(request);
      },
      (err: GeneralError) => {
        assert.strictEqual(err instanceof GeneralError, true);
        assert.deepStrictEqual(err.getClientError(response), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: MOVIE.TITLE.MIN_LENGTH.ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Create validation: Title too short', async (context) => {
    const { poster, ...movieData } =
      await generateMovieDataIncludingPoster(randomUUID());
    const { request, response } = createHttpMocks<ResponseWithContext>({
      logger,
      reqOptions: {
        body: {
          ...movieData,
          title: randomAlphaNumericString(MOVIE.TITLE.MIN_LENGTH.VALUE - 1),
        },
        file: poster,
      },
    });

    const validateCreateMovieSpy = context.mock.fn(
      validationFunctions.validateCreateMovie,
    );

    assert.throws(
      () => {
        validateCreateMovieSpy(request);
      },
      (err: GeneralError) => {
        assert.strictEqual(err instanceof GeneralError, true);
        assert.deepStrictEqual(err.getClientError(response), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: MOVIE.TITLE.MIN_LENGTH.ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Create validation: Title too long', async (context) => {
    const { poster, ...movieData } =
      await generateMovieDataIncludingPoster(randomUUID());
    const { request, response } = createHttpMocks<ResponseWithContext>({
      logger,
      reqOptions: {
        body: {
          ...movieData,
          title: randomAlphaNumericString(MOVIE.TITLE.MAX_LENGTH.VALUE + 1),
        },
        file: poster,
      },
    });

    const validateCreateMovieSpy = context.mock.fn(
      validationFunctions.validateCreateMovie,
    );

    assert.throws(
      () => {
        validateCreateMovieSpy(request);
      },
      (err: GeneralError) => {
        assert.strictEqual(err instanceof GeneralError, true);
        assert.deepStrictEqual(err.getClientError(response), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: MOVIE.TITLE.MAX_LENGTH.ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Create validation: Missing description', async (context) => {
    const { poster, ...movieData } =
      await generateMovieDataIncludingPoster(randomUUID());
    const { request, response } = createHttpMocks<ResponseWithContext>({
      logger,
      reqOptions: {
        body: {
          ...movieData,
          description: undefined,
        },
        file: poster,
      },
    });

    const validateCreateMovieSpy = context.mock.fn(
      validationFunctions.validateCreateMovie,
    );

    assert.throws(
      () => {
        validateCreateMovieSpy(request);
      },
      (err: GeneralError) => {
        assert.strictEqual(err instanceof GeneralError, true);
        assert.deepStrictEqual(err.getClientError(response), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: MOVIE.DESCRIPTION.REQUIRED_ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Create validation: Empty description', async (context) => {
    const { poster, ...movieData } =
      await generateMovieDataIncludingPoster(randomUUID());
    const { request, response } = createHttpMocks<ResponseWithContext>({
      logger,
      reqOptions: {
        body: {
          ...movieData,
          description: '',
        },
        file: poster,
      },
    });

    const validateCreateMovieSpy = context.mock.fn(
      validationFunctions.validateCreateMovie,
    );

    assert.throws(
      () => {
        validateCreateMovieSpy(request);
      },
      (err: GeneralError) => {
        assert.strictEqual(err instanceof GeneralError, true);
        assert.deepStrictEqual(err.getClientError(response), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: MOVIE.DESCRIPTION.MIN_LENGTH.ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Create validation: Description too short', async (context) => {
    const { poster, ...movieData } =
      await generateMovieDataIncludingPoster(randomUUID());
    const { request, response } = createHttpMocks<ResponseWithContext>({
      logger,
      reqOptions: {
        body: {
          ...movieData,
          description: randomAlphaNumericString(
            MOVIE.DESCRIPTION.MIN_LENGTH.VALUE - 1,
          ),
        },
        file: poster,
      },
    });

    const validateCreateMovieSpy = context.mock.fn(
      validationFunctions.validateCreateMovie,
    );

    assert.throws(
      () => {
        validateCreateMovieSpy(request);
      },
      (err: GeneralError) => {
        assert.strictEqual(err instanceof GeneralError, true);
        assert.deepStrictEqual(err.getClientError(response), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: MOVIE.DESCRIPTION.MIN_LENGTH.ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Create validation: Description too long', async (context) => {
    const { poster, ...movieData } =
      await generateMovieDataIncludingPoster(randomUUID());
    const { request, response } = createHttpMocks<ResponseWithContext>({
      logger,
      reqOptions: {
        body: {
          ...movieData,
          description: randomAlphaNumericString(
            MOVIE.DESCRIPTION.MAX_LENGTH.VALUE + 1,
          ),
        },
        file: poster,
      },
    });

    const validateCreateMovieSpy = context.mock.fn(
      validationFunctions.validateCreateMovie,
    );

    assert.throws(
      () => {
        validateCreateMovieSpy(request);
      },
      (err: GeneralError) => {
        assert.strictEqual(err instanceof GeneralError, true);
        assert.deepStrictEqual(err.getClientError(response), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: MOVIE.DESCRIPTION.MAX_LENGTH.ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Create validation: Missing poster', async (context) => {
    const { poster, ...movieData } =
      await generateMovieDataIncludingPoster(randomUUID());
    const { request, response } = createHttpMocks<ResponseWithContext>({
      logger,
      reqOptions: {
        body: movieData,
      },
    });

    const validateCreateMovieSpy = context.mock.fn(
      validationFunctions.validateCreateMovie,
    );

    assert.throws(
      () => {
        validateCreateMovieSpy(request);
      },
      (err: GeneralError) => {
        assert.strictEqual(err instanceof GeneralError, true);
        assert.deepStrictEqual(err.getClientError(response), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: MOVIE.POSTER.REQUIRED_ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Create validation: Missing poster path', async (context) => {
    const { poster, ...movieData } =
      await generateMovieDataIncludingPoster(randomUUID());
    const { request, response } = createHttpMocks<ResponseWithContext>({
      logger,
      reqOptions: {
        body: movieData,
        file: {
          ...poster,
          path: undefined,
        },
      },
    });

    const validateCreateMovieSpy = context.mock.fn(
      validationFunctions.validateCreateMovie,
    );

    assert.throws(
      () => {
        validateCreateMovieSpy(request);
      },
      (err: GeneralError) => {
        assert.strictEqual(err instanceof GeneralError, true);
        assert.deepStrictEqual(err.getClientError(response), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: MOVIE.POSTER.ABSOLUTE_FILE_PATH.REQUIRED_ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Create validation: Empty poster path', async (context) => {
    const { poster, ...movieData } =
      await generateMovieDataIncludingPoster(randomUUID());
    const { request, response } = createHttpMocks<ResponseWithContext>({
      logger,
      reqOptions: {
        body: movieData,
        file: {
          ...poster,
          path: '',
        },
      },
    });

    const validateCreateMovieSpy = context.mock.fn(
      validationFunctions.validateCreateMovie,
    );

    assert.throws(
      () => {
        validateCreateMovieSpy(request);
      },
      (err: GeneralError) => {
        assert.strictEqual(err instanceof GeneralError, true);
        assert.deepStrictEqual(err.getClientError(response), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: MOVIE.POSTER.ABSOLUTE_FILE_PATH.MIN_LENGTH.ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Create validation: Poster path too short', async (context) => {
    const { poster, ...movieData } =
      await generateMovieDataIncludingPoster(randomUUID());
    const { request, response } = createHttpMocks<ResponseWithContext>({
      logger,
      reqOptions: {
        body: movieData,
        file: {
          ...poster,
          path: randomAlphaNumericString(
            MOVIE.POSTER.ABSOLUTE_FILE_PATH.MIN_LENGTH.VALUE - 1,
          ),
        },
      },
    });

    const validateCreateMovieSpy = context.mock.fn(
      validationFunctions.validateCreateMovie,
    );

    assert.throws(
      () => {
        validateCreateMovieSpy(request);
      },
      (err: GeneralError) => {
        assert.strictEqual(err instanceof GeneralError, true);
        assert.deepStrictEqual(err.getClientError(response), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: MOVIE.POSTER.ABSOLUTE_FILE_PATH.MIN_LENGTH.ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Create validation: Poster path too long', async (context) => {
    const { poster, ...movieData } =
      await generateMovieDataIncludingPoster(randomUUID());
    const { request, response } = createHttpMocks<ResponseWithContext>({
      logger,
      reqOptions: {
        body: movieData,
        file: {
          ...poster,
          path: randomAlphaNumericString(
            MOVIE.POSTER.ABSOLUTE_FILE_PATH.MAX_LENGTH.VALUE + 1,
          ),
        },
      },
    });

    const validateCreateMovieSpy = context.mock.fn(
      validationFunctions.validateCreateMovie,
    );

    assert.throws(
      () => {
        validateCreateMovieSpy(request);
      },
      (err: GeneralError) => {
        assert.strictEqual(err instanceof GeneralError, true);
        assert.deepStrictEqual(err.getClientError(response), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: MOVIE.POSTER.ABSOLUTE_FILE_PATH.MAX_LENGTH.ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Create validation: Missing mime type', async (context) => {
    const { poster, ...movieData } =
      await generateMovieDataIncludingPoster(randomUUID());
    const { request, response } = createHttpMocks<ResponseWithContext>({
      logger,
      reqOptions: {
        body: movieData,
        file: {
          ...poster,
          mimeType: undefined,
        },
      },
    });

    const validateCreateMovieSpy = context.mock.fn(
      validationFunctions.validateCreateMovie,
    );

    assert.throws(
      () => {
        validateCreateMovieSpy(request);
      },
      (err: GeneralError) => {
        assert.strictEqual(err instanceof GeneralError, true);
        assert.deepStrictEqual(err.getClientError(response), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: MOVIE.POSTER.MIME_TYPE.REQUIRED_ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Create validation: Empty mime path', async (context) => {
    const { poster, ...movieData } =
      await generateMovieDataIncludingPoster(randomUUID());
    const { request, response } = createHttpMocks<ResponseWithContext>({
      logger,
      reqOptions: {
        body: movieData,
        file: {
          ...poster,
          mimeType: '',
        },
      },
    });

    const validateCreateMovieSpy = context.mock.fn(
      validationFunctions.validateCreateMovie,
    );

    assert.throws(
      () => {
        validateCreateMovieSpy(request);
      },
      (err: GeneralError) => {
        assert.strictEqual(err instanceof GeneralError, true);
        assert.deepStrictEqual(err.getClientError(response), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: MOVIE.POSTER.MIME_TYPE.REQUIRED_ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Create validation: Missing poster size', async (context) => {
    const { poster, ...movieData } =
      await generateMovieDataIncludingPoster(randomUUID());
    const { request, response } = createHttpMocks<ResponseWithContext>({
      logger,
      reqOptions: {
        body: movieData,
        file: {
          ...poster,
          size: undefined,
        },
      },
    });

    const validateCreateMovieSpy = context.mock.fn(
      validationFunctions.validateCreateMovie,
    );

    assert.throws(
      () => {
        validateCreateMovieSpy(request);
      },
      (err: GeneralError) => {
        assert.strictEqual(err instanceof GeneralError, true);
        assert.deepStrictEqual(err.getClientError(response), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: MOVIE.POSTER.FILE_SIZE.REQUIRED_ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Create validation: Empty poster size', async (context) => {
    const { poster, ...movieData } =
      await generateMovieDataIncludingPoster(randomUUID());
    const { request, response } = createHttpMocks<ResponseWithContext>({
      logger,
      reqOptions: {
        body: movieData,
        file: {
          ...poster,
          size: '',
        },
      },
    });

    const validateCreateMovieSpy = context.mock.fn(
      validationFunctions.validateCreateMovie,
    );

    assert.throws(
      () => {
        validateCreateMovieSpy(request);
      },
      (err: GeneralError) => {
        assert.strictEqual(err instanceof GeneralError, true);
        assert.deepStrictEqual(err.getClientError(response), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: MOVIE.POSTER.FILE_SIZE.INVALID_TYPE_ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Create validation: Poster size too small', async (context) => {
    const { poster, ...movieData } =
      await generateMovieDataIncludingPoster(randomUUID());
    const { request, response } = createHttpMocks<ResponseWithContext>({
      logger,
      reqOptions: {
        body: movieData,
        file: {
          ...poster,
          size: MOVIE.POSTER.FILE_SIZE.MIN_VALUE.VALUE - 1,
        },
      },
    });

    const validateCreateMovieSpy = context.mock.fn(
      validationFunctions.validateCreateMovie,
    );

    assert.throws(
      () => {
        validateCreateMovieSpy(request);
      },
      (err: GeneralError) => {
        assert.strictEqual(err instanceof GeneralError, true);
        assert.deepStrictEqual(err.getClientError(response), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: MOVIE.POSTER.FILE_SIZE.MIN_VALUE.ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Create validation: Poster size too large', async (context) => {
    const { poster, ...movieData } =
      await generateMovieDataIncludingPoster(randomUUID());
    const { request, response } = createHttpMocks<ResponseWithContext>({
      logger,
      reqOptions: {
        body: movieData,
        file: {
          ...poster,
          size: MOVIE.POSTER.FILE_SIZE.MAX_VALUE.VALUE + 1,
        },
      },
    });

    const validateCreateMovieSpy = context.mock.fn(
      validationFunctions.validateCreateMovie,
    );

    assert.throws(
      () => {
        validateCreateMovieSpy(request);
      },
      (err: GeneralError) => {
        assert.strictEqual(err instanceof GeneralError, true);
        assert.deepStrictEqual(err.getClientError(response), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: MOVIE.POSTER.FILE_SIZE.MAX_VALUE.ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Create validation: Missing price', async (context) => {
    const { poster, ...movieData } =
      await generateMovieDataIncludingPoster(randomUUID());
    const { request, response } = createHttpMocks<ResponseWithContext>({
      logger,
      reqOptions: {
        body: {
          ...movieData,
          price: undefined,
        },
        file: poster,
      },
    });

    const validateCreateMovieSpy = context.mock.fn(
      validationFunctions.validateCreateMovie,
    );

    assert.throws(
      () => {
        validateCreateMovieSpy(request);
      },
      (err: GeneralError) => {
        assert.strictEqual(err instanceof GeneralError, true);
        assert.deepStrictEqual(err.getClientError(response), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: MOVIE.PRICE.REQUIRED_ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Create validation: Empty price', async (context) => {
    const { poster, ...movieData } =
      await generateMovieDataIncludingPoster(randomUUID());
    const { request, response } = createHttpMocks<ResponseWithContext>({
      logger,
      reqOptions: {
        body: {
          ...movieData,
          price: '',
        },
        file: poster,
      },
    });

    const validateCreateMovieSpy = context.mock.fn(
      validationFunctions.validateCreateMovie,
    );

    assert.throws(
      () => {
        validateCreateMovieSpy(request);
      },
      (err: GeneralError) => {
        assert.strictEqual(err instanceof GeneralError, true);
        assert.deepStrictEqual(err.getClientError(response), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: MOVIE.PRICE.INVALID_TYPE_ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Create validation: Price too low', async (context) => {
    const { poster, ...movieData } =
      await generateMovieDataIncludingPoster(randomUUID());
    const { request, response } = createHttpMocks<ResponseWithContext>({
      logger,
      reqOptions: {
        body: {
          ...movieData,
          price: MOVIE.PRICE.MIN_VALUE.VALUE - 1,
        },
        file: poster,
      },
    });

    const validateCreateMovieSpy = context.mock.fn(
      validationFunctions.validateCreateMovie,
    );

    assert.throws(
      () => {
        validateCreateMovieSpy(request);
      },
      (err: GeneralError) => {
        assert.strictEqual(err instanceof GeneralError, true);
        assert.deepStrictEqual(err.getClientError(response), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: MOVIE.PRICE.MIN_VALUE.ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Create validation: Price too high', async (context) => {
    const { poster, ...movieData } =
      await generateMovieDataIncludingPoster(randomUUID());
    const { request, response } = createHttpMocks<ResponseWithContext>({
      logger,
      reqOptions: {
        body: {
          ...movieData,
          price: MOVIE.PRICE.MAX_VALUE.VALUE + 1,
        },
        file: poster,
      },
    });

    const validateCreateMovieSpy = context.mock.fn(
      validationFunctions.validateCreateMovie,
    );

    assert.throws(
      () => {
        validateCreateMovieSpy(request);
      },
      (err: GeneralError) => {
        assert.strictEqual(err instanceof GeneralError, true);
        assert.deepStrictEqual(err.getClientError(response), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: MOVIE.PRICE.MAX_VALUE.ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Create validation: Missing genre id', async (context) => {
    const { poster, ...movieData } =
      await generateMovieDataIncludingPoster(randomUUID());
    const { request, response } = createHttpMocks<ResponseWithContext>({
      logger,
      reqOptions: {
        body: {
          ...movieData,
          genreId: undefined,
        },
        file: poster,
      },
    });

    const validateCreateMovieSpy = context.mock.fn(
      validationFunctions.validateCreateMovie,
    );

    assert.throws(
      () => {
        validateCreateMovieSpy(request);
      },
      (err: GeneralError) => {
        assert.strictEqual(err instanceof GeneralError, true);
        assert.deepStrictEqual(err.getClientError(response), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: MOVIE.GENRE_ID.REQUIRED_ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Create validation: Empty genre id', async (context) => {
    const { poster, ...movieData } =
      await generateMovieDataIncludingPoster(randomUUID());
    const { request, response } = createHttpMocks<ResponseWithContext>({
      logger,
      reqOptions: {
        body: {
          ...movieData,
          genreId: '',
        },
        file: poster,
      },
    });

    const validateCreateMovieSpy = context.mock.fn(
      validationFunctions.validateCreateMovie,
    );

    assert.throws(
      () => {
        validateCreateMovieSpy(request);
      },
      (err: GeneralError) => {
        assert.strictEqual(err instanceof GeneralError, true);
        assert.deepStrictEqual(err.getClientError(response), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: MOVIE.GENRE_ID.ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Create validation: Invalid genre id', async (context) => {
    const { poster, ...movieData } =
      await generateMovieDataIncludingPoster(randomUUID());
    const { request, response } = createHttpMocks<ResponseWithContext>({
      logger,
      reqOptions: {
        body: {
          ...movieData,
          genreId: randomAlphaNumericString(),
        },
        file: poster,
      },
    });

    const validateCreateMovieSpy = context.mock.fn(
      validationFunctions.validateCreateMovie,
    );

    assert.throws(
      () => {
        validateCreateMovieSpy(request);
      },
      (err: GeneralError) => {
        assert.strictEqual(err instanceof GeneralError, true);
        assert.deepStrictEqual(err.getClientError(response), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: MOVIE.GENRE_ID.ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Create service: Non-existent genre id', async () => {
    const { response } = createHttpMocks<ResponseWithContext>({ logger });
    const genreId = randomUUID();
    const movieData = await generateMovieDataIncludingPoster(genreId);

    await assert.rejects(
      async () => {
        await serviceFunctions.createMovie(
          {
            authentication: serverParams.authentication,
            database: serverParams.database,
            fileManager: serverParams.fileManager,
            logger,
          },
          {
            ...movieData,
            poster: {
              absolutePath: movieData.poster.path,
              mimeType: movieData.poster.mimeType,
              sizeInBytes: movieData.poster.size,
            },
          },
        );
      },
      (err: GeneralError) => {
        assert.strictEqual(err instanceof GeneralError, true);
        assert.deepStrictEqual(err.getClientError(response), {
          code: HTTP_STATUS_CODES.NOT_FOUND,
          message: `Genre '${genreId}' does not exist`,
        });

        return true;
      },
    );
  });
  await test('Invalid - Update validation: Without updates', (context) => {
    const { request, response } = createHttpMocks<ResponseWithContext>({
      logger,
      reqOptions: {
        params: { movie_id: randomUUID() },
      },
    });

    const validateUpdateMovieSpy = context.mock.fn(
      validationFunctions.validateUpdateMovie,
    );

    assert.throws(
      () => {
        validateUpdateMovieSpy(request);
      },
      (err: GeneralError) => {
        assert.strictEqual(err instanceof GeneralError, true);
        assert.deepStrictEqual(err.getClientError(response), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: MOVIE.NO_FIELDS_TO_UPDATE_ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Update validation: Missing id', (context) => {
    const { request, response } = createHttpMocks<ResponseWithContext>({
      logger,
      reqOptions: { body: { genreId: randomUUID() } },
    });

    const validateUpdateMovieSpy = context.mock.fn(
      validationFunctions.validateUpdateMovie,
    );

    assert.throws(
      () => {
        validateUpdateMovieSpy(request);
      },
      (err: GeneralError) => {
        assert.strictEqual(err instanceof GeneralError, true);
        assert.deepStrictEqual(err.getClientError(response), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: MOVIE.ID.REQUIRED_ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Update validation: Empty id', (context) => {
    const { request, response } = createHttpMocks<ResponseWithContext>({
      logger,
      reqOptions: {
        params: { movie_id: '' },
        body: { genreId: randomUUID() },
      },
    });

    const validateUpdateMovieSpy = context.mock.fn(
      validationFunctions.validateUpdateMovie,
    );

    assert.throws(
      () => {
        validateUpdateMovieSpy(request);
      },
      (err: GeneralError) => {
        assert.strictEqual(err instanceof GeneralError, true);
        assert.deepStrictEqual(err.getClientError(response), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: MOVIE.ID.ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Update validation: Invalid id', (context) => {
    const { request, response } = createHttpMocks<ResponseWithContext>({
      logger,
      reqOptions: {
        params: { movie_id: randomAlphaNumericString() },
        body: { genreId: randomUUID() },
      },
    });

    const validateUpdateMovieSpy = context.mock.fn(
      validationFunctions.validateUpdateMovie,
    );

    assert.throws(
      () => {
        validateUpdateMovieSpy(request);
      },
      (err: GeneralError) => {
        assert.strictEqual(err instanceof GeneralError, true);
        assert.deepStrictEqual(err.getClientError(response), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: MOVIE.ID.ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Update validation: Empty title', (context) => {
    const { request, response } = createHttpMocks<ResponseWithContext>({
      logger,
      reqOptions: {
        params: { movie_id: randomUUID() },
        body: { title: '', genreId: randomUUID() },
      },
    });

    const validateUpdateMovieSpy = context.mock.fn(
      validationFunctions.validateUpdateMovie,
    );

    assert.throws(
      () => {
        validateUpdateMovieSpy(request);
      },
      (err: GeneralError) => {
        assert.strictEqual(err instanceof GeneralError, true);
        assert.deepStrictEqual(err.getClientError(response), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: MOVIE.TITLE.MIN_LENGTH.ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Update validation: Title too short', (context) => {
    const { request, response } = createHttpMocks<ResponseWithContext>({
      logger,
      reqOptions: {
        params: { movie_id: randomUUID() },
        body: {
          title: randomAlphaNumericString(MOVIE.TITLE.MIN_LENGTH.VALUE - 1),
          genreId: randomUUID(),
        },
      },
    });

    const validateUpdateMovieSpy = context.mock.fn(
      validationFunctions.validateUpdateMovie,
    );

    assert.throws(
      () => {
        validateUpdateMovieSpy(request);
      },
      (err: GeneralError) => {
        assert.strictEqual(err instanceof GeneralError, true);
        assert.deepStrictEqual(err.getClientError(response), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: MOVIE.TITLE.MIN_LENGTH.ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Update validation: Title too long', (context) => {
    const { request, response } = createHttpMocks<ResponseWithContext>({
      logger,
      reqOptions: {
        params: { movie_id: randomUUID() },
        body: {
          title: randomAlphaNumericString(MOVIE.TITLE.MAX_LENGTH.VALUE + 1),
          genreId: randomUUID(),
        },
      },
    });

    const validateUpdateMovieSpy = context.mock.fn(
      validationFunctions.validateUpdateMovie,
    );

    assert.throws(
      () => {
        validateUpdateMovieSpy(request);
      },
      (err: GeneralError) => {
        assert.strictEqual(err instanceof GeneralError, true);
        assert.deepStrictEqual(err.getClientError(response), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: MOVIE.TITLE.MAX_LENGTH.ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Update validation: Empty description', (context) => {
    const { request, response } = createHttpMocks<ResponseWithContext>({
      logger,
      reqOptions: {
        params: { movie_id: randomUUID() },
        body: { description: '', genreId: randomUUID() },
      },
    });

    const validateUpdateMovieSpy = context.mock.fn(
      validationFunctions.validateUpdateMovie,
    );

    assert.throws(
      () => {
        validateUpdateMovieSpy(request);
      },
      (err: GeneralError) => {
        assert.strictEqual(err instanceof GeneralError, true);
        assert.deepStrictEqual(err.getClientError(response), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: MOVIE.DESCRIPTION.MIN_LENGTH.ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Update validation: Description too short', (context) => {
    const { request, response } = createHttpMocks<ResponseWithContext>({
      logger,
      reqOptions: {
        params: { movie_id: randomUUID() },
        body: {
          description: randomAlphaNumericString(
            MOVIE.DESCRIPTION.MIN_LENGTH.VALUE - 1,
          ),
          genreId: randomUUID(),
        },
      },
    });

    const validateUpdateMovieSpy = context.mock.fn(
      validationFunctions.validateUpdateMovie,
    );

    assert.throws(
      () => {
        validateUpdateMovieSpy(request);
      },
      (err: GeneralError) => {
        assert.strictEqual(err instanceof GeneralError, true);
        assert.deepStrictEqual(err.getClientError(response), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: MOVIE.DESCRIPTION.MIN_LENGTH.ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Update validation: Description too long', (context) => {
    const { request, response } = createHttpMocks<ResponseWithContext>({
      logger,
      reqOptions: {
        params: { movie_id: randomUUID() },
        body: {
          description: randomAlphaNumericString(
            MOVIE.DESCRIPTION.MAX_LENGTH.VALUE + 1,
          ),
          genreId: randomUUID(),
        },
      },
    });

    const validateUpdateMovieSpy = context.mock.fn(
      validationFunctions.validateUpdateMovie,
    );

    assert.throws(
      () => {
        validateUpdateMovieSpy(request);
      },
      (err: GeneralError) => {
        assert.strictEqual(err instanceof GeneralError, true);
        assert.deepStrictEqual(err.getClientError(response), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: MOVIE.DESCRIPTION.MAX_LENGTH.ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Update validation: Missing poster path', (context) => {
    const { request, response } = createHttpMocks<ResponseWithContext>({
      logger,
      reqOptions: {
        params: { movie_id: randomUUID() },
        file: {
          path: undefined,
          mimeType: 'application/json',
          size: 2_048,
        },
      },
    });

    const validateUpdateMovieSpy = context.mock.fn(
      validationFunctions.validateUpdateMovie,
    );

    assert.throws(
      () => {
        validateUpdateMovieSpy(request);
      },
      (err: GeneralError) => {
        assert.strictEqual(err instanceof GeneralError, true);
        assert.deepStrictEqual(err.getClientError(response), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: MOVIE.POSTER.ABSOLUTE_FILE_PATH.REQUIRED_ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Update validation: Empty poster path', (context) => {
    const { request, response } = createHttpMocks<ResponseWithContext>({
      logger,
      reqOptions: {
        params: { movie_id: randomUUID() },
        file: {
          path: '',
          mimeType: 'application/json',
          size: 2_048,
        },
      },
    });

    const validateUpdateMovieSpy = context.mock.fn(
      validationFunctions.validateUpdateMovie,
    );

    assert.throws(
      () => {
        validateUpdateMovieSpy(request);
      },
      (err: GeneralError) => {
        assert.strictEqual(err instanceof GeneralError, true);
        assert.deepStrictEqual(err.getClientError(response), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: MOVIE.POSTER.ABSOLUTE_FILE_PATH.MIN_LENGTH.ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Update validation: Poster path too short', (context) => {
    const { request, response } = createHttpMocks<ResponseWithContext>({
      logger,
      reqOptions: {
        params: { movie_id: randomUUID() },
        file: {
          path: randomAlphaNumericString(
            MOVIE.POSTER.ABSOLUTE_FILE_PATH.MIN_LENGTH.VALUE - 1,
          ),
          mimeType: 'application/json',
          size: MOVIE.POSTER.FILE_SIZE.MIN_VALUE.VALUE + 1,
        },
      },
    });

    const validateUpdateMovieSpy = context.mock.fn(
      validationFunctions.validateUpdateMovie,
    );

    assert.throws(
      () => {
        validateUpdateMovieSpy(request);
      },
      (err: GeneralError) => {
        assert.strictEqual(err instanceof GeneralError, true);
        assert.deepStrictEqual(err.getClientError(response), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: MOVIE.POSTER.ABSOLUTE_FILE_PATH.MIN_LENGTH.ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Update validation: Poster path too long', (context) => {
    const { request, response } = createHttpMocks<ResponseWithContext>({
      logger,
      reqOptions: {
        params: { movie_id: randomUUID() },
        file: {
          path: randomAlphaNumericString(
            MOVIE.POSTER.ABSOLUTE_FILE_PATH.MAX_LENGTH.VALUE + 1,
          ),
          mimeType: 'application/json',
          size: MOVIE.POSTER.FILE_SIZE.MIN_VALUE.VALUE + 1,
        },
      },
    });

    const validateUpdateMovieSpy = context.mock.fn(
      validationFunctions.validateUpdateMovie,
    );

    assert.throws(
      () => {
        validateUpdateMovieSpy(request);
      },
      (err: GeneralError) => {
        assert.strictEqual(err instanceof GeneralError, true);
        assert.deepStrictEqual(err.getClientError(response), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: MOVIE.POSTER.ABSOLUTE_FILE_PATH.MAX_LENGTH.ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Update validation: Missing mime type', (context) => {
    const { request, response } = createHttpMocks<ResponseWithContext>({
      logger,
      reqOptions: {
        params: { movie_id: randomUUID() },
        file: {
          path: '/tmp',
          mimeType: undefined,
          size: 2_048,
        },
      },
    });

    const validateUpdateMovieSpy = context.mock.fn(
      validationFunctions.validateUpdateMovie,
    );

    assert.throws(
      () => {
        validateUpdateMovieSpy(request);
      },
      (err: GeneralError) => {
        assert.strictEqual(err instanceof GeneralError, true);
        assert.deepStrictEqual(err.getClientError(response), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: MOVIE.POSTER.MIME_TYPE.REQUIRED_ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Update validation: Empty mime path', (context) => {
    const { request, response } = createHttpMocks<ResponseWithContext>({
      logger,
      reqOptions: {
        params: { movie_id: randomUUID() },
        file: {
          path: '/tmp',
          mimeType: '',
          size: 2_048,
        },
      },
    });

    const validateUpdateMovieSpy = context.mock.fn(
      validationFunctions.validateUpdateMovie,
    );

    assert.throws(
      () => {
        validateUpdateMovieSpy(request);
      },
      (err: GeneralError) => {
        assert.strictEqual(err instanceof GeneralError, true);
        assert.deepStrictEqual(err.getClientError(response), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: MOVIE.POSTER.MIME_TYPE.REQUIRED_ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Update validation: Missing poster size', (context) => {
    const { request, response } = createHttpMocks<ResponseWithContext>({
      logger,
      reqOptions: {
        params: { movie_id: randomUUID() },
        file: {
          path: '/tmp',
          mimeType: 'application/json',
          size: undefined,
        },
      },
    });

    const validateUpdateMovieSpy = context.mock.fn(
      validationFunctions.validateUpdateMovie,
    );

    assert.throws(
      () => {
        validateUpdateMovieSpy(request);
      },
      (err: GeneralError) => {
        assert.strictEqual(err instanceof GeneralError, true);
        assert.deepStrictEqual(err.getClientError(response), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: MOVIE.POSTER.FILE_SIZE.REQUIRED_ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Update validation: Empty poster size', (context) => {
    const { request, response } = createHttpMocks<ResponseWithContext>({
      logger,
      reqOptions: {
        params: { movie_id: randomUUID() },
        file: {
          path: '/tmp',
          mimeType: 'application/json',
          size: '',
        },
      },
    });

    const validateUpdateMovieSpy = context.mock.fn(
      validationFunctions.validateUpdateMovie,
    );

    assert.throws(
      () => {
        validateUpdateMovieSpy(request);
      },
      (err: GeneralError) => {
        assert.strictEqual(err instanceof GeneralError, true);
        assert.deepStrictEqual(err.getClientError(response), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: MOVIE.POSTER.FILE_SIZE.INVALID_TYPE_ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Update validation: Poster size too small', (context) => {
    const { request, response } = createHttpMocks<ResponseWithContext>({
      logger,
      reqOptions: {
        params: { movie_id: randomUUID() },
        file: {
          path: '/tmp',
          mimeType: 'application/json',
          size: MOVIE.POSTER.FILE_SIZE.MIN_VALUE.VALUE - 1,
        },
      },
    });

    const validateUpdateMovieSpy = context.mock.fn(
      validationFunctions.validateUpdateMovie,
    );

    assert.throws(
      () => {
        validateUpdateMovieSpy(request);
      },
      (err: GeneralError) => {
        assert.strictEqual(err instanceof GeneralError, true);
        assert.deepStrictEqual(err.getClientError(response), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: MOVIE.POSTER.FILE_SIZE.MIN_VALUE.ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Update validation: Poster size too large', (context) => {
    const { request, response } = createHttpMocks<ResponseWithContext>({
      logger,
      reqOptions: {
        params: { movie_id: randomUUID() },
        file: {
          path: '/tmp',
          mimeType: 'application/json',
          size: MOVIE.POSTER.FILE_SIZE.MAX_VALUE.VALUE + 1,
        },
      },
    });

    const validateUpdateMovieSpy = context.mock.fn(
      validationFunctions.validateUpdateMovie,
    );

    assert.throws(
      () => {
        validateUpdateMovieSpy(request);
      },
      (err: GeneralError) => {
        assert.strictEqual(err instanceof GeneralError, true);
        assert.deepStrictEqual(err.getClientError(response), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: MOVIE.POSTER.FILE_SIZE.MAX_VALUE.ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Update validation: Empty price', (context) => {
    const { request, response } = createHttpMocks<ResponseWithContext>({
      logger,
      reqOptions: {
        params: { movie_id: randomUUID() },
        body: { price: '', genreId: randomUUID() },
      },
    });

    const validateUpdateMovieSpy = context.mock.fn(
      validationFunctions.validateUpdateMovie,
    );

    assert.throws(
      () => {
        validateUpdateMovieSpy(request);
      },
      (err: GeneralError) => {
        assert.strictEqual(err instanceof GeneralError, true);
        assert.deepStrictEqual(err.getClientError(response), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: MOVIE.PRICE.INVALID_TYPE_ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Update validation: Price too low', (context) => {
    const { request, response } = createHttpMocks<ResponseWithContext>({
      logger,
      reqOptions: {
        params: { movie_id: randomUUID() },
        body: {
          price: MOVIE.PRICE.MIN_VALUE.VALUE - 1,
          genreId: randomUUID(),
        },
      },
    });

    const validateUpdateMovieSpy = context.mock.fn(
      validationFunctions.validateUpdateMovie,
    );

    assert.throws(
      () => {
        validateUpdateMovieSpy(request);
      },
      (err: GeneralError) => {
        assert.strictEqual(err instanceof GeneralError, true);
        assert.deepStrictEqual(err.getClientError(response), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: MOVIE.PRICE.MIN_VALUE.ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Update validation: Price too high', (context) => {
    const { request, response } = createHttpMocks<ResponseWithContext>({
      logger,
      reqOptions: {
        params: { movie_id: randomUUID() },
        body: {
          price: MOVIE.PRICE.MAX_VALUE.VALUE + 1,
          genreId: randomUUID(),
        },
      },
    });

    const validateUpdateMovieSpy = context.mock.fn(
      validationFunctions.validateUpdateMovie,
    );

    assert.throws(
      () => {
        validateUpdateMovieSpy(request);
      },
      (err: GeneralError) => {
        assert.strictEqual(err instanceof GeneralError, true);
        assert.deepStrictEqual(err.getClientError(response), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: MOVIE.PRICE.MAX_VALUE.ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Update validation: Empty genre id', (context) => {
    const { request, response } = createHttpMocks<ResponseWithContext>({
      logger,
      reqOptions: {
        params: { movie_id: randomUUID() },
        body: { title: randomAlphaNumericString(), genreId: '' },
      },
    });

    const validateUpdateMovieSpy = context.mock.fn(
      validationFunctions.validateUpdateMovie,
    );

    assert.throws(
      () => {
        validateUpdateMovieSpy(request);
      },
      (err: GeneralError) => {
        assert.strictEqual(err instanceof GeneralError, true);
        assert.deepStrictEqual(err.getClientError(response), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: MOVIE.GENRE_ID.ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Update validation: Invalid genre id', (context) => {
    const { request, response } = createHttpMocks<ResponseWithContext>({
      logger,
      reqOptions: {
        params: { movie_id: randomUUID() },
        body: {
          title: randomAlphaNumericString(),
          genreId: randomAlphaNumericString(),
        },
      },
    });

    const validateUpdateMovieSpy = context.mock.fn(
      validationFunctions.validateUpdateMovie,
    );

    assert.throws(
      () => {
        validateUpdateMovieSpy(request);
      },
      (err: GeneralError) => {
        assert.strictEqual(err instanceof GeneralError, true);
        assert.deepStrictEqual(err.getClientError(response), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: MOVIE.GENRE_ID.ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Update service: Non-existent movie', async () => {
    const { response } = createHttpMocks<ResponseWithContext>({ logger });
    const movieId = randomUUID();

    await assert.rejects(
      async () => {
        await serviceFunctions.updateMovie(
          {
            authentication: serverParams.authentication,
            database: serverParams.database,
            fileManager: serverParams.fileManager,
            logger,
          },
          {
            movieId,
            title: randomAlphaNumericString(MOVIE.TITLE.MIN_LENGTH.VALUE + 1),
          },
        );
      },
      (err: GeneralError) => {
        assert.strictEqual(err instanceof GeneralError, true);
        assert.deepStrictEqual(err.getClientError(response), {
          code: HTTP_STATUS_CODES.NOT_FOUND,
          message: `Movie '${movieId}' does not exist`,
        });

        return true;
      },
    );
  });
  await test('Invalid - Update service: Non-existent genre id', async () => {
    const { response } = createHttpMocks<ResponseWithContext>({ logger });
    const updatedGenreId = randomUUID();

    const { createdMovie } = await seedMovie(serverParams);

    try {
      await assert.rejects(
        async () => {
          await serviceFunctions.updateMovie(
            {
              authentication: serverParams.authentication,
              database: serverParams.database,
              fileManager: serverParams.fileManager,
              logger,
            },
            {
              movieId: createdMovie.id,
              genreId: updatedGenreId,
            },
          );
        },
        (err: GeneralError) => {
          assert.strictEqual(err instanceof GeneralError, true);
          assert.deepStrictEqual(err.getClientError(response), {
            code: HTTP_STATUS_CODES.NOT_FOUND,
            message: `Genre '${updatedGenreId}' does not exist`,
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

    const validateDeleteMovieSpy = context.mock.fn(
      validationFunctions.validateDeleteMovie,
    );

    assert.throws(
      () => {
        validateDeleteMovieSpy(request);
      },
      (err: GeneralError) => {
        assert.strictEqual(err instanceof GeneralError, true);
        assert.deepStrictEqual(err.getClientError(response), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: MOVIE.ID.REQUIRED_ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Delete validation: Empty id', (context) => {
    const { request, response } = createHttpMocks<ResponseWithContext>({
      logger,
      reqOptions: { params: { movie_id: '' } },
    });

    const validateDeleteMovieSpy = context.mock.fn(
      validationFunctions.validateDeleteMovie,
    );

    assert.throws(
      () => {
        validateDeleteMovieSpy(request);
      },
      (err: GeneralError) => {
        assert.strictEqual(err instanceof GeneralError, true);
        assert.deepStrictEqual(err.getClientError(response), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: MOVIE.ID.ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Delete validation: Invalid id', (context) => {
    const { request, response } = createHttpMocks<ResponseWithContext>({
      logger,
      reqOptions: { params: { movie_id: randomAlphaNumericString() } },
    });

    const validateDeleteMovieSpy = context.mock.fn(
      validationFunctions.validateDeleteMovie,
    );

    assert.throws(
      () => {
        validateDeleteMovieSpy(request);
      },
      (err: GeneralError) => {
        assert.strictEqual(err instanceof GeneralError, true);
        assert.deepStrictEqual(err.getClientError(response), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: MOVIE.ID.ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
});
