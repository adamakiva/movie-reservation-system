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
  deleteGenres,
  deleteMovies,
  generateMovieDataIncludingPoster,
  seedMovie,
  serviceFunctions,
  validationFunctions,
} from './utils.js';

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
    const { request } = createHttpMocks<ResponseWithContext>({
      logger,
    });

    const validateGetMovieSpy = context.mock.fn(
      validationFunctions.validateGetMovie,
    );

    assert.throws(
      () => {
        validateGetMovieSpy(request);
      },
      (err) => {
        assert.strictEqual(err instanceof MRSError, true);
        assert.deepStrictEqual((err as MRSError).getClientError(), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: MOVIE.ID.REQUIRED_ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Read single validation: Empty id', (context) => {
    const { request } = createHttpMocks<ResponseWithContext>({
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
      (err) => {
        assert.strictEqual(err instanceof MRSError, true);
        assert.deepStrictEqual((err as MRSError).getClientError(), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: MOVIE.ID.ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Read single validation: Invalid id', (context) => {
    const { request } = createHttpMocks<ResponseWithContext>({
      logger,
      reqOptions: {
        params: { movie_id: randomString() },
      },
    });

    const validateGetMovieSpy = context.mock.fn(
      validationFunctions.validateGetMovie,
    );

    assert.throws(
      () => {
        validateGetMovieSpy(request);
      },
      (err) => {
        assert.strictEqual(err instanceof MRSError, true);
        assert.deepStrictEqual((err as MRSError).getClientError(), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: MOVIE.ID.ERROR_MESSAGE,
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

    const validateGetMoviesSpy = context.mock.fn(
      validationFunctions.validateGetMovies,
    );

    assert.throws(
      () => {
        validateGetMoviesSpy(request);
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

    const validateGetMoviesSpy = context.mock.fn(
      validationFunctions.validateGetMovies,
    );

    assert.throws(
      () => {
        validateGetMoviesSpy(request);
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

    const validateGetMoviesSpy = context.mock.fn(
      validationFunctions.validateGetMovies,
    );

    assert.throws(
      () => {
        validateGetMoviesSpy(request);
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

    const validateGetMoviesSpy = context.mock.fn(
      validationFunctions.validateGetMovies,
    );

    assert.throws(
      () => {
        validateGetMoviesSpy(request);
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

    const validateGetMoviesSpy = context.mock.fn(
      validationFunctions.validateGetMovies,
    );

    assert.throws(
      () => {
        validateGetMoviesSpy(request);
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

    const validateGetMoviesSpy = context.mock.fn(
      validationFunctions.validateGetMovies,
    );

    assert.throws(
      () => {
        validateGetMoviesSpy(request);
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

    const validateGetMoviesSpy = context.mock.fn(
      validationFunctions.validateGetMovies,
    );

    assert.throws(
      () => {
        validateGetMoviesSpy(request);
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
  await test('Invalid - Create validation: Missing title', async (context) => {
    const { poster, ...movieData } =
      await generateMovieDataIncludingPoster(randomUUID());
    const { request } = createHttpMocks<ResponseWithContext>({
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
      (err) => {
        assert.strictEqual(err instanceof MRSError, true);
        assert.deepStrictEqual((err as MRSError).getClientError(), {
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
    const { request } = createHttpMocks<ResponseWithContext>({
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
      (err) => {
        assert.strictEqual(err instanceof MRSError, true);
        assert.deepStrictEqual((err as MRSError).getClientError(), {
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
    const { request } = createHttpMocks<ResponseWithContext>({
      logger,
      reqOptions: {
        body: {
          ...movieData,
          title: randomString(MOVIE.TITLE.MIN_LENGTH.VALUE - 1),
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
      (err) => {
        assert.strictEqual(err instanceof MRSError, true);
        assert.deepStrictEqual((err as MRSError).getClientError(), {
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
    const { request } = createHttpMocks<ResponseWithContext>({
      logger,
      reqOptions: {
        body: {
          ...movieData,
          title: randomString(MOVIE.TITLE.MAX_LENGTH.VALUE + 1),
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
      (err) => {
        assert.strictEqual(err instanceof MRSError, true);
        assert.deepStrictEqual((err as MRSError).getClientError(), {
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
    const { request } = createHttpMocks<ResponseWithContext>({
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
      (err) => {
        assert.strictEqual(err instanceof MRSError, true);
        assert.deepStrictEqual((err as MRSError).getClientError(), {
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
    const { request } = createHttpMocks<ResponseWithContext>({
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
      (err) => {
        assert.strictEqual(err instanceof MRSError, true);
        assert.deepStrictEqual((err as MRSError).getClientError(), {
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
    const { request } = createHttpMocks<ResponseWithContext>({
      logger,
      reqOptions: {
        body: {
          ...movieData,
          description: randomString(MOVIE.DESCRIPTION.MIN_LENGTH.VALUE - 1),
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
      (err) => {
        assert.strictEqual(err instanceof MRSError, true);
        assert.deepStrictEqual((err as MRSError).getClientError(), {
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
    const { request } = createHttpMocks<ResponseWithContext>({
      logger,
      reqOptions: {
        body: {
          ...movieData,
          description: randomString(MOVIE.DESCRIPTION.MAX_LENGTH.VALUE + 1),
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
      (err) => {
        assert.strictEqual(err instanceof MRSError, true);
        assert.deepStrictEqual((err as MRSError).getClientError(), {
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
    const { request } = createHttpMocks<ResponseWithContext>({
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
      (err) => {
        assert.strictEqual(err instanceof MRSError, true);
        assert.deepStrictEqual((err as MRSError).getClientError(), {
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
    const { request } = createHttpMocks<ResponseWithContext>({
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
      (err) => {
        assert.strictEqual(err instanceof MRSError, true);
        assert.deepStrictEqual((err as MRSError).getClientError(), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: MOVIE.POSTER.FILE_PATH.REQUIRED_ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Create validation: Empty poster path', async (context) => {
    const { poster, ...movieData } =
      await generateMovieDataIncludingPoster(randomUUID());
    const { request } = createHttpMocks<ResponseWithContext>({
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
      (err) => {
        assert.strictEqual(err instanceof MRSError, true);
        assert.deepStrictEqual((err as MRSError).getClientError(), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: MOVIE.POSTER.FILE_PATH.MIN_LENGTH.ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Create validation: Poster path too short', async (context) => {
    const { poster, ...movieData } =
      await generateMovieDataIncludingPoster(randomUUID());
    const { request } = createHttpMocks<ResponseWithContext>({
      logger,
      reqOptions: {
        body: movieData,
        file: {
          ...poster,
          path: randomString(MOVIE.POSTER.FILE_PATH.MIN_LENGTH.VALUE - 1),
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
      (err) => {
        assert.strictEqual(err instanceof MRSError, true);
        assert.deepStrictEqual((err as MRSError).getClientError(), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: MOVIE.POSTER.FILE_PATH.MIN_LENGTH.ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Create validation: Poster path too long', async (context) => {
    const { poster, ...movieData } =
      await generateMovieDataIncludingPoster(randomUUID());
    const { request } = createHttpMocks<ResponseWithContext>({
      logger,
      reqOptions: {
        body: movieData,
        file: {
          ...poster,
          path: randomString(MOVIE.POSTER.FILE_PATH.MAX_LENGTH.VALUE + 1),
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
      (err) => {
        assert.strictEqual(err instanceof MRSError, true);
        assert.deepStrictEqual((err as MRSError).getClientError(), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: MOVIE.POSTER.FILE_PATH.MAX_LENGTH.ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Create validation: Missing mime type', async (context) => {
    const { poster, ...movieData } =
      await generateMovieDataIncludingPoster(randomUUID());
    const { request } = createHttpMocks<ResponseWithContext>({
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
      (err) => {
        assert.strictEqual(err instanceof MRSError, true);
        assert.deepStrictEqual((err as MRSError).getClientError(), {
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
    const { request } = createHttpMocks<ResponseWithContext>({
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
      (err) => {
        assert.strictEqual(err instanceof MRSError, true);
        assert.deepStrictEqual((err as MRSError).getClientError(), {
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
    const { request } = createHttpMocks<ResponseWithContext>({
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
      (err) => {
        assert.strictEqual(err instanceof MRSError, true);
        assert.deepStrictEqual((err as MRSError).getClientError(), {
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
    const { request } = createHttpMocks<ResponseWithContext>({
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
      (err) => {
        assert.strictEqual(err instanceof MRSError, true);
        assert.deepStrictEqual((err as MRSError).getClientError(), {
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
    const { request } = createHttpMocks<ResponseWithContext>({
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
      (err) => {
        assert.strictEqual(err instanceof MRSError, true);
        assert.deepStrictEqual((err as MRSError).getClientError(), {
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
    const { request } = createHttpMocks<ResponseWithContext>({
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
      (err) => {
        assert.strictEqual(err instanceof MRSError, true);
        assert.deepStrictEqual((err as MRSError).getClientError(), {
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
    const { request } = createHttpMocks<ResponseWithContext>({
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
      (err) => {
        assert.strictEqual(err instanceof MRSError, true);
        assert.deepStrictEqual((err as MRSError).getClientError(), {
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
    const { request } = createHttpMocks<ResponseWithContext>({
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
      (err) => {
        assert.strictEqual(err instanceof MRSError, true);
        assert.deepStrictEqual((err as MRSError).getClientError(), {
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
    const { request } = createHttpMocks<ResponseWithContext>({
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
      (err) => {
        assert.strictEqual(err instanceof MRSError, true);
        assert.deepStrictEqual((err as MRSError).getClientError(), {
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
    const { request } = createHttpMocks<ResponseWithContext>({
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
      (err) => {
        assert.strictEqual(err instanceof MRSError, true);
        assert.deepStrictEqual((err as MRSError).getClientError(), {
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
    const { request } = createHttpMocks<ResponseWithContext>({
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
      (err) => {
        assert.strictEqual(err instanceof MRSError, true);
        assert.deepStrictEqual((err as MRSError).getClientError(), {
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
    const { request } = createHttpMocks<ResponseWithContext>({
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
      (err) => {
        assert.strictEqual(err instanceof MRSError, true);
        assert.deepStrictEqual((err as MRSError).getClientError(), {
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
    const { request } = createHttpMocks<ResponseWithContext>({
      logger,
      reqOptions: {
        body: {
          ...movieData,
          genreId: randomString(),
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
      (err) => {
        assert.strictEqual(err instanceof MRSError, true);
        assert.deepStrictEqual((err as MRSError).getClientError(), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: MOVIE.GENRE_ID.ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Create service: Non-existent genre id', async () => {
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
          movieData,
        );
      },
      (err) => {
        assert.strictEqual(err instanceof MRSError, true);
        assert.deepStrictEqual((err as MRSError).getClientError(), {
          code: HTTP_STATUS_CODES.NOT_FOUND,
          message: `Genre '${genreId}' does not exist`,
        });

        return true;
      },
    );
  });
  await test('Invalid - Update validation: Without updates', (context) => {
    const { request } = createHttpMocks<ResponseWithContext>({
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
      (err) => {
        assert.strictEqual(err instanceof MRSError, true);
        assert.deepStrictEqual((err as MRSError).getClientError(), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: MOVIE.NO_FIELDS_TO_UPDATE_ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Update validation: Missing id', (context) => {
    const { request } = createHttpMocks<ResponseWithContext>({
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
      (err) => {
        assert.strictEqual(err instanceof MRSError, true);
        assert.deepStrictEqual((err as MRSError).getClientError(), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: MOVIE.ID.REQUIRED_ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Update validation: Empty id', (context) => {
    const { request } = createHttpMocks<ResponseWithContext>({
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
      (err) => {
        assert.strictEqual(err instanceof MRSError, true);
        assert.deepStrictEqual((err as MRSError).getClientError(), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: MOVIE.ID.ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Update validation: Invalid id', (context) => {
    const { request } = createHttpMocks<ResponseWithContext>({
      logger,
      reqOptions: {
        params: { movie_id: randomString() },
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
      (err) => {
        assert.strictEqual(err instanceof MRSError, true);
        assert.deepStrictEqual((err as MRSError).getClientError(), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: MOVIE.ID.ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Update validation: Empty title', (context) => {
    const { request } = createHttpMocks<ResponseWithContext>({
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
      (err) => {
        assert.strictEqual(err instanceof MRSError, true);
        assert.deepStrictEqual((err as MRSError).getClientError(), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: MOVIE.TITLE.MIN_LENGTH.ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Update validation: Title too short', (context) => {
    const { request } = createHttpMocks<ResponseWithContext>({
      logger,
      reqOptions: {
        params: { movie_id: randomUUID() },
        body: {
          title: randomString(MOVIE.TITLE.MIN_LENGTH.VALUE - 1),
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
      (err) => {
        assert.strictEqual(err instanceof MRSError, true);
        assert.deepStrictEqual((err as MRSError).getClientError(), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: MOVIE.TITLE.MIN_LENGTH.ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Update validation: Title too long', (context) => {
    const { request } = createHttpMocks<ResponseWithContext>({
      logger,
      reqOptions: {
        params: { movie_id: randomUUID() },
        body: {
          title: randomString(MOVIE.TITLE.MAX_LENGTH.VALUE + 1),
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
      (err) => {
        assert.strictEqual(err instanceof MRSError, true);
        assert.deepStrictEqual((err as MRSError).getClientError(), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: MOVIE.TITLE.MAX_LENGTH.ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Update validation: Empty description', (context) => {
    const { request } = createHttpMocks<ResponseWithContext>({
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
      (err) => {
        assert.strictEqual(err instanceof MRSError, true);
        assert.deepStrictEqual((err as MRSError).getClientError(), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: MOVIE.DESCRIPTION.MIN_LENGTH.ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Update validation: Description too short', (context) => {
    const { request } = createHttpMocks<ResponseWithContext>({
      logger,
      reqOptions: {
        params: { movie_id: randomUUID() },
        body: {
          description: randomString(MOVIE.DESCRIPTION.MIN_LENGTH.VALUE - 1),
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
      (err) => {
        assert.strictEqual(err instanceof MRSError, true);
        assert.deepStrictEqual((err as MRSError).getClientError(), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: MOVIE.DESCRIPTION.MIN_LENGTH.ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Update validation: Description too long', (context) => {
    const { request } = createHttpMocks<ResponseWithContext>({
      logger,
      reqOptions: {
        params: { movie_id: randomUUID() },
        body: {
          description: randomString(MOVIE.DESCRIPTION.MAX_LENGTH.VALUE + 1),
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
      (err) => {
        assert.strictEqual(err instanceof MRSError, true);
        assert.deepStrictEqual((err as MRSError).getClientError(), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: MOVIE.DESCRIPTION.MAX_LENGTH.ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Update validation: Missing poster path', (context) => {
    const { request } = createHttpMocks<ResponseWithContext>({
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
      (err) => {
        assert.strictEqual(err instanceof MRSError, true);
        assert.deepStrictEqual((err as MRSError).getClientError(), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: MOVIE.POSTER.FILE_PATH.REQUIRED_ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Update validation: Empty poster path', (context) => {
    const { request } = createHttpMocks<ResponseWithContext>({
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
      (err) => {
        assert.strictEqual(err instanceof MRSError, true);
        assert.deepStrictEqual((err as MRSError).getClientError(), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: MOVIE.POSTER.FILE_PATH.MIN_LENGTH.ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Update validation: Poster path too short', (context) => {
    const { request } = createHttpMocks<ResponseWithContext>({
      logger,
      reqOptions: {
        params: { movie_id: randomUUID() },
        file: {
          path: randomString(MOVIE.POSTER.FILE_PATH.MIN_LENGTH.VALUE - 1),
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
      (err) => {
        assert.strictEqual(err instanceof MRSError, true);
        assert.deepStrictEqual((err as MRSError).getClientError(), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: MOVIE.POSTER.FILE_PATH.MIN_LENGTH.ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Update validation: Poster path too long', (context) => {
    const { request } = createHttpMocks<ResponseWithContext>({
      logger,
      reqOptions: {
        params: { movie_id: randomUUID() },
        file: {
          path: randomString(MOVIE.POSTER.FILE_PATH.MAX_LENGTH.VALUE + 1),
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
      (err) => {
        assert.strictEqual(err instanceof MRSError, true);
        assert.deepStrictEqual((err as MRSError).getClientError(), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: MOVIE.POSTER.FILE_PATH.MAX_LENGTH.ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Update validation: Missing mime type', (context) => {
    const { request } = createHttpMocks<ResponseWithContext>({
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
      (err) => {
        assert.strictEqual(err instanceof MRSError, true);
        assert.deepStrictEqual((err as MRSError).getClientError(), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: MOVIE.POSTER.MIME_TYPE.REQUIRED_ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Update validation: Empty mime path', (context) => {
    const { request } = createHttpMocks<ResponseWithContext>({
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
      (err) => {
        assert.strictEqual(err instanceof MRSError, true);
        assert.deepStrictEqual((err as MRSError).getClientError(), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: MOVIE.POSTER.MIME_TYPE.REQUIRED_ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Update validation: Missing poster size', (context) => {
    const { request } = createHttpMocks<ResponseWithContext>({
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
      (err) => {
        assert.strictEqual(err instanceof MRSError, true);
        assert.deepStrictEqual((err as MRSError).getClientError(), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: MOVIE.POSTER.FILE_SIZE.REQUIRED_ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Update validation: Empty poster size', (context) => {
    const { request } = createHttpMocks<ResponseWithContext>({
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
      (err) => {
        assert.strictEqual(err instanceof MRSError, true);
        assert.deepStrictEqual((err as MRSError).getClientError(), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: MOVIE.POSTER.FILE_SIZE.INVALID_TYPE_ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Update validation: Poster size too small', (context) => {
    const { request } = createHttpMocks<ResponseWithContext>({
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
      (err) => {
        assert.strictEqual(err instanceof MRSError, true);
        assert.deepStrictEqual((err as MRSError).getClientError(), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: MOVIE.POSTER.FILE_SIZE.MIN_VALUE.ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Update validation: Poster size too large', (context) => {
    const { request } = createHttpMocks<ResponseWithContext>({
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
      (err) => {
        assert.strictEqual(err instanceof MRSError, true);
        assert.deepStrictEqual((err as MRSError).getClientError(), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: MOVIE.POSTER.FILE_SIZE.MAX_VALUE.ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Update validation: Empty price', (context) => {
    const { request } = createHttpMocks<ResponseWithContext>({
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
      (err) => {
        assert.strictEqual(err instanceof MRSError, true);
        assert.deepStrictEqual((err as MRSError).getClientError(), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: MOVIE.PRICE.INVALID_TYPE_ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Update validation: Price too low', (context) => {
    const { request } = createHttpMocks<ResponseWithContext>({
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
      (err) => {
        assert.strictEqual(err instanceof MRSError, true);
        assert.deepStrictEqual((err as MRSError).getClientError(), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: MOVIE.PRICE.MIN_VALUE.ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Update validation: Price too high', (context) => {
    const { request } = createHttpMocks<ResponseWithContext>({
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
      (err) => {
        assert.strictEqual(err instanceof MRSError, true);
        assert.deepStrictEqual((err as MRSError).getClientError(), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: MOVIE.PRICE.MAX_VALUE.ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Update validation: Empty genre id', (context) => {
    const { request } = createHttpMocks<ResponseWithContext>({
      logger,
      reqOptions: {
        params: { movie_id: randomUUID() },
        body: { title: randomString(), genreId: '' },
      },
    });

    const validateUpdateMovieSpy = context.mock.fn(
      validationFunctions.validateUpdateMovie,
    );

    assert.throws(
      () => {
        validateUpdateMovieSpy(request);
      },
      (err) => {
        assert.strictEqual(err instanceof MRSError, true);
        assert.deepStrictEqual((err as MRSError).getClientError(), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: MOVIE.GENRE_ID.ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Update validation: Invalid genre id', (context) => {
    const { request } = createHttpMocks<ResponseWithContext>({
      logger,
      reqOptions: {
        params: { movie_id: randomUUID() },
        body: { title: randomString(), genreId: randomString() },
      },
    });

    const validateUpdateMovieSpy = context.mock.fn(
      validationFunctions.validateUpdateMovie,
    );

    assert.throws(
      () => {
        validateUpdateMovieSpy(request);
      },
      (err) => {
        assert.strictEqual(err instanceof MRSError, true);
        assert.deepStrictEqual((err as MRSError).getClientError(), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: MOVIE.GENRE_ID.ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Update service: Non-existent movie', async () => {
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
            title: randomString(MOVIE.TITLE.MIN_LENGTH.VALUE + 1),
          },
        );
      },
      (err) => {
        assert.strictEqual(err instanceof MRSError, true);
        assert.deepStrictEqual((err as MRSError).getClientError(), {
          code: HTTP_STATUS_CODES.NOT_FOUND,
          message: `Movie '${movieId}' does not exist`,
        });

        return true;
      },
    );
  });
  await test('Invalid - Update service: Non-existent genre id', async () => {
    const genreIds: string[] = [];
    const movieIds: string[] = [];
    const updatedGenreId = randomUUID();

    const { createdGenre: genre, createdMovie: movie } =
      await seedMovie(serverParams);
    genreIds.push(genre.id);
    movieIds.push(movie.id);

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
              movieId: movie.id,
              genreId: updatedGenreId,
            },
          );
        },
        (err) => {
          assert.strictEqual(err instanceof MRSError, true);
          assert.deepStrictEqual((err as MRSError).getClientError(), {
            code: HTTP_STATUS_CODES.NOT_FOUND,
            message: `Genre '${updatedGenreId}' does not exist`,
          });

          return true;
        },
      );
    } finally {
      await deleteMovies(serverParams, ...movieIds);
      await deleteGenres(serverParams, ...genreIds);
    }
  });
  await test('Invalid - Delete validation: Missing id', (context) => {
    const { request } = createHttpMocks<ResponseWithContext>({
      logger,
    });

    const validateDeleteMovieSpy = context.mock.fn(
      validationFunctions.validateDeleteMovie,
    );

    assert.throws(
      () => {
        validateDeleteMovieSpy(request);
      },
      (err) => {
        assert.strictEqual(err instanceof MRSError, true);
        assert.deepStrictEqual((err as MRSError).getClientError(), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: MOVIE.ID.REQUIRED_ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Delete validation: Empty id', (context) => {
    const { request } = createHttpMocks<ResponseWithContext>({
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
      (err) => {
        assert.strictEqual(err instanceof MRSError, true);
        assert.deepStrictEqual((err as MRSError).getClientError(), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: MOVIE.ID.ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Delete validation: Invalid id', (context) => {
    const { request } = createHttpMocks<ResponseWithContext>({
      logger,
      reqOptions: { params: { movie_id: randomString() } },
    });

    const validateDeleteMovieSpy = context.mock.fn(
      validationFunctions.validateDeleteMovie,
    );

    assert.throws(
      () => {
        validateDeleteMovieSpy(request);
      },
      (err) => {
        assert.strictEqual(err instanceof MRSError, true);
        assert.deepStrictEqual((err as MRSError).getClientError(), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: MOVIE.ID.ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
});
