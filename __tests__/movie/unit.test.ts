import * as service from '../../src/entities/movie/service/index.js';
import * as validator from '../../src/entities/movie/validator.js';

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

import { generateMoviesData, seedMovie } from './utils.js';

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

  await test('Invalid - Read single validation: Missing id', (ctx) => {
    const { request } = createHttpMocks<ResponseWithCtx>({
      logger,
    });

    const validateGetMovieSpy = ctx.mock.fn(validator.validateGetMovie);

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
  await test('Invalid - Read single validation: Empty id', (ctx) => {
    const { request } = createHttpMocks<ResponseWithCtx>({
      logger,
      reqOptions: {
        params: { movieId: '' },
      },
    });

    const validateGetMovieSpy = ctx.mock.fn(validator.validateGetMovie);

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
  await test('Invalid - Read single validation: Invalid id', (ctx) => {
    const { request } = createHttpMocks<ResponseWithCtx>({
      logger,
      reqOptions: {
        params: { movieId: randomString() },
      },
    });

    const validateGetMovieSpy = ctx.mock.fn(validator.validateGetMovie);

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
    const getMovieSpy = ctx.mock.fn(service.getMovie);

    await assert.rejects(
      async () => {
        await getMovieSpy(
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

    const validateGetMoviesSpy = ctx.mock.fn(validator.validateGetMovies);

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

    const validateGetMoviesSpy = ctx.mock.fn(validator.validateGetMovies);

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

    const validateGetMoviesSpy = ctx.mock.fn(validator.validateGetMovies);

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
  await test('Invalid - Read multiple validation: Invalid cursor', (ctx) => {
    const { request } = createHttpMocks<ResponseWithCtx>({
      logger,
      reqOptions: {
        query: { cursor: Buffer.from(randomUUID()).toString('base64') },
      },
    });

    const validateGetMoviesSpy = ctx.mock.fn(validator.validateGetMovies);

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
  await test('Invalid - Read multiple validation: Page size too low', (ctx) => {
    const { request } = createHttpMocks<ResponseWithCtx>({
      logger,
      reqOptions: {
        query: {
          pageSize: PAGINATION.PAGE_SIZE.MIN_LENGTH.VALUE - 1,
        },
      },
    });

    const validateGetMoviesSpy = ctx.mock.fn(validator.validateGetMovies);

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
  await test('Invalid - Read multiple validation: Page size too high', (ctx) => {
    const { request } = createHttpMocks<ResponseWithCtx>({
      logger,
      reqOptions: {
        query: {
          pageSize: PAGINATION.PAGE_SIZE.MAX_LENGTH.VALUE + 1,
        },
      },
    });

    const validateGetMoviesSpy = ctx.mock.fn(validator.validateGetMovies);

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
  await test('Invalid - Read multiple validation: Invalid page size', (ctx) => {
    const { request } = createHttpMocks<ResponseWithCtx>({
      logger,
      reqOptions: {
        query: { pageSize: randomString(8) },
      },
    });

    const validateGetMoviesSpy = ctx.mock.fn(validator.validateGetMovies);

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
  await test('Invalid - Create validation: Missing title', (ctx) => {
    const { request } = createHttpMocks<ResponseWithCtx>({
      logger,
      reqOptions: {
        body: {
          ...generateMoviesData([randomUUID()], 1),
          title: undefined,
        },
      },
    });

    const validateCreateMovieSpy = ctx.mock.fn(validator.validateCreateMovie);

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
  await test('Invalid - Create validation: Empty title', (ctx) => {
    const { request } = createHttpMocks<ResponseWithCtx>({
      logger,
      reqOptions: {
        body: {
          ...generateMoviesData([randomUUID()], 1),
          title: '',
        },
      },
    });

    const validateCreateMovieSpy = ctx.mock.fn(validator.validateCreateMovie);

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
  await test('Invalid - Create validation: Title too short', (ctx) => {
    const { request } = createHttpMocks<ResponseWithCtx>({
      logger,
      reqOptions: {
        body: {
          ...generateMoviesData([randomUUID()], 1),
          title: 'a'.repeat(MOVIE.TITLE.MIN_LENGTH.VALUE - 1),
        },
      },
    });

    const validateCreateMovieSpy = ctx.mock.fn(validator.validateCreateMovie);

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
  await test('Invalid - Create validation: Title too long', (ctx) => {
    const { request } = createHttpMocks<ResponseWithCtx>({
      logger,
      reqOptions: {
        body: {
          ...generateMoviesData([randomUUID()], 1),
          title: 'a'.repeat(MOVIE.TITLE.MAX_LENGTH.VALUE + 1),
        },
      },
    });

    const validateCreateMovieSpy = ctx.mock.fn(validator.validateCreateMovie);

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
  await test('Invalid - Create validation: Missing description', (ctx) => {
    const { request } = createHttpMocks<ResponseWithCtx>({
      logger,
      reqOptions: {
        body: {
          ...generateMoviesData([randomUUID()], 1),
          description: undefined,
        },
      },
    });

    const validateCreateMovieSpy = ctx.mock.fn(validator.validateCreateMovie);

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
  await test('Invalid - Create validation: Empty description', (ctx) => {
    const { request } = createHttpMocks<ResponseWithCtx>({
      logger,
      reqOptions: {
        body: {
          ...generateMoviesData([randomUUID()], 1),
          description: '',
        },
      },
    });

    const validateCreateMovieSpy = ctx.mock.fn(validator.validateCreateMovie);

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
  await test('Invalid - Create validation: Description too short', (ctx) => {
    const { request } = createHttpMocks<ResponseWithCtx>({
      logger,
      reqOptions: {
        body: {
          ...generateMoviesData([randomUUID()], 1),
          description: 'a'.repeat(MOVIE.DESCRIPTION.MIN_LENGTH.VALUE - 1),
        },
      },
    });

    const validateCreateMovieSpy = ctx.mock.fn(validator.validateCreateMovie);

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
  await test('Invalid - Create validation: Description too long', (ctx) => {
    const { request } = createHttpMocks<ResponseWithCtx>({
      logger,
      reqOptions: {
        body: {
          ...generateMoviesData([randomUUID()], 1),
          description: 'a'.repeat(MOVIE.DESCRIPTION.MAX_LENGTH.VALUE + 1),
        },
      },
    });

    const validateCreateMovieSpy = ctx.mock.fn(validator.validateCreateMovie);

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
  await test('Invalid - Create validation: Missing image path', (ctx) => {
    const { request } = createHttpMocks<ResponseWithCtx>({
      logger,
      reqOptions: {
        body: {
          ...generateMoviesData([randomUUID()], 1),
          imagePath: undefined,
        },
      },
    });

    const validateCreateMovieSpy = ctx.mock.fn(validator.validateCreateMovie);

    assert.throws(
      () => {
        validateCreateMovieSpy(request);
      },
      (err) => {
        assert.strictEqual(err instanceof MRSError, true);
        assert.deepStrictEqual((err as MRSError).getClientError(), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: MOVIE.IMAGE_PATH.REQUIRED_ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Create validation: Empty image path', (ctx) => {
    const { request } = createHttpMocks<ResponseWithCtx>({
      logger,
      reqOptions: {
        body: {
          ...generateMoviesData([randomUUID()], 1),
          imagePath: '',
        },
      },
    });

    const validateCreateMovieSpy = ctx.mock.fn(validator.validateCreateMovie);

    assert.throws(
      () => {
        validateCreateMovieSpy(request);
      },
      (err) => {
        assert.strictEqual(err instanceof MRSError, true);
        assert.deepStrictEqual((err as MRSError).getClientError(), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: `${MOVIE.IMAGE_PATH.MIN_LENGTH.ERROR_MESSAGE}, ${MOVIE.IMAGE_PATH.ERROR_MESSAGE}`,
        });

        return true;
      },
    );
  });
  await test('Invalid - Create validation: Image path too short', (ctx) => {
    const { request } = createHttpMocks<ResponseWithCtx>({
      logger,
      reqOptions: {
        body: {
          ...generateMoviesData([randomUUID()], 1),
          imagePath: 'a'.repeat(MOVIE.IMAGE_PATH.MIN_LENGTH.VALUE - 1),
        },
      },
    });

    const validateCreateMovieSpy = ctx.mock.fn(validator.validateCreateMovie);

    assert.throws(
      () => {
        validateCreateMovieSpy(request);
      },
      (err) => {
        assert.strictEqual(err instanceof MRSError, true);
        assert.deepStrictEqual((err as MRSError).getClientError(), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: `${MOVIE.IMAGE_PATH.MIN_LENGTH.ERROR_MESSAGE}, ${MOVIE.IMAGE_PATH.ERROR_MESSAGE}`,
        });

        return true;
      },
    );
  });
  await test('Invalid - Create validation: Image path too long', (ctx) => {
    const { request } = createHttpMocks<ResponseWithCtx>({
      logger,
      reqOptions: {
        body: {
          ...generateMoviesData([randomUUID()], 1),
          imagePath: `${'a'.repeat(MOVIE.IMAGE_PATH.MAX_LENGTH.VALUE + 1)}@ph.com`,
        },
      },
    });

    const validateCreateMovieSpy = ctx.mock.fn(validator.validateCreateMovie);

    assert.throws(
      () => {
        validateCreateMovieSpy(request);
      },
      (err) => {
        assert.strictEqual(err instanceof MRSError, true);
        assert.deepStrictEqual((err as MRSError).getClientError(), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: MOVIE.IMAGE_PATH.MAX_LENGTH.ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Create validation: Invalid image path', (ctx) => {
    const { request } = createHttpMocks<ResponseWithCtx>({
      logger,
      reqOptions: {
        body: {
          ...generateMoviesData([randomUUID()], 1),
          imagePath: randomString(),
        },
      },
    });

    const validateCreateMovieSpy = ctx.mock.fn(validator.validateCreateMovie);

    assert.throws(
      () => {
        validateCreateMovieSpy(request);
      },
      (err) => {
        assert.strictEqual(err instanceof MRSError, true);
        assert.deepStrictEqual((err as MRSError).getClientError(), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: MOVIE.IMAGE_PATH.ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Create validation: Missing price', (ctx) => {
    const { request } = createHttpMocks<ResponseWithCtx>({
      logger,
      reqOptions: {
        body: {
          ...generateMoviesData([randomUUID()], 1),
          price: undefined,
        },
      },
    });

    const validateCreateMovieSpy = ctx.mock.fn(validator.validateCreateMovie);

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
  await test('Invalid - Create validation: Empty price', (ctx) => {
    const { request } = createHttpMocks<ResponseWithCtx>({
      logger,
      reqOptions: {
        body: {
          ...generateMoviesData([randomUUID()], 1),
          price: '',
        },
      },
    });

    const validateCreateMovieSpy = ctx.mock.fn(validator.validateCreateMovie);

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
  await test('Invalid - Create validation: Price too low', (ctx) => {
    const { request } = createHttpMocks<ResponseWithCtx>({
      logger,
      reqOptions: {
        body: {
          ...generateMoviesData([randomUUID()], 1),
          price: MOVIE.PRICE.MIN_VALUE.VALUE - 1,
        },
      },
    });

    const validateCreateMovieSpy = ctx.mock.fn(validator.validateCreateMovie);

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
  await test('Invalid - Create validation: Price too high', (ctx) => {
    const { request } = createHttpMocks<ResponseWithCtx>({
      logger,
      reqOptions: {
        body: {
          ...generateMoviesData([randomUUID()], 1),
          PRICE: MOVIE.PRICE.MAX_VALUE.VALUE + 1,
        },
      },
    });

    const validateCreateMovieSpy = ctx.mock.fn(validator.validateCreateMovie);

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
  await test('Invalid - Create validation: Missing genre id', (ctx) => {
    const { request } = createHttpMocks<ResponseWithCtx>({
      logger,
      reqOptions: {
        body: {
          ...generateMoviesData([randomUUID()], 1),
          genreId: undefined,
        },
      },
    });

    const validateCreateMovieSpy = ctx.mock.fn(validator.validateCreateMovie);

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
  await test('Invalid - Create validation: Empty genre id', (ctx) => {
    const { request } = createHttpMocks<ResponseWithCtx>({
      logger,
      reqOptions: {
        body: {
          ...generateMoviesData([randomUUID()], 1),
          genreId: '',
        },
      },
    });

    const validateCreateMovieSpy = ctx.mock.fn(validator.validateCreateMovie);

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
  await test('Invalid - Create validation: Invalid genre id', (ctx) => {
    const { request } = createHttpMocks<ResponseWithCtx>({
      logger,
      reqOptions: {
        body: {
          ...generateMoviesData([randomUUID()], 1),
          genreId: randomString(),
        },
      },
    });

    const validateCreateMovieSpy = ctx.mock.fn(validator.validateCreateMovie);

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

    await assert.rejects(
      async () => {
        await service.createMovie(
          {
            authentication: serverParams.authentication,
            database: serverParams.database,
            logger,
          },
          generateMoviesData([genreId], 1),
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
  await test('Invalid - Update validation: Without updates', (ctx) => {
    const { request } = createHttpMocks<ResponseWithCtx>({
      logger,
      reqOptions: {
        params: { movieId: randomUUID() },
      },
    });

    const validateUpdateMovieSpy = ctx.mock.fn(validator.validateUpdateMovie);

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
  await test('Invalid - Update validation: Missing id', (ctx) => {
    const { request } = createHttpMocks<ResponseWithCtx>({
      logger,
      reqOptions: { body: { genreId: randomUUID() } },
    });

    const validateUpdateMovieSpy = ctx.mock.fn(validator.validateUpdateMovie);

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
  await test('Invalid - Update validation: Empty id', (ctx) => {
    const { request } = createHttpMocks<ResponseWithCtx>({
      logger,
      reqOptions: {
        params: { movieId: '' },
        body: { genreId: randomUUID() },
      },
    });

    const validateUpdateMovieSpy = ctx.mock.fn(validator.validateUpdateMovie);

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
  await test('Invalid - Update validation: Invalid id', (ctx) => {
    const { request } = createHttpMocks<ResponseWithCtx>({
      logger,
      reqOptions: {
        params: { movieId: randomString() },
        body: { genreId: randomUUID() },
      },
    });

    const validateUpdateMovieSpy = ctx.mock.fn(validator.validateUpdateMovie);

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
  await test('Invalid - Update validation: Empty title', (ctx) => {
    const { request } = createHttpMocks<ResponseWithCtx>({
      logger,
      reqOptions: {
        params: { movieId: randomUUID() },
        body: { title: '', genreId: randomUUID() },
      },
    });

    const validateUpdateMovieSpy = ctx.mock.fn(validator.validateUpdateMovie);

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
  await test('Invalid - Update validation: Title too short', (ctx) => {
    const { request } = createHttpMocks<ResponseWithCtx>({
      logger,
      reqOptions: {
        params: { movieId: randomUUID() },
        body: {
          title: 'a'.repeat(MOVIE.TITLE.MIN_LENGTH.VALUE - 1),
          genreId: randomUUID(),
        },
      },
    });

    const validateUpdateMovieSpy = ctx.mock.fn(validator.validateUpdateMovie);

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
  await test('Invalid - Update validation: Title too long', (ctx) => {
    const { request } = createHttpMocks<ResponseWithCtx>({
      logger,
      reqOptions: {
        params: { movieId: randomUUID() },
        body: {
          title: 'a'.repeat(MOVIE.TITLE.MAX_LENGTH.VALUE + 1),
          genreId: randomUUID(),
        },
      },
    });

    const validateUpdateMovieSpy = ctx.mock.fn(validator.validateUpdateMovie);

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
  await test('Invalid - Update validation: Empty description', (ctx) => {
    const { request } = createHttpMocks<ResponseWithCtx>({
      logger,
      reqOptions: {
        params: { movieId: randomUUID() },
        body: { description: '', genreId: randomUUID() },
      },
    });

    const validateUpdateMovieSpy = ctx.mock.fn(validator.validateUpdateMovie);

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
  await test('Invalid - Update validation: Description too short', (ctx) => {
    const { request } = createHttpMocks<ResponseWithCtx>({
      logger,
      reqOptions: {
        params: { movieId: randomUUID() },
        body: {
          description: 'a'.repeat(MOVIE.DESCRIPTION.MIN_LENGTH.VALUE - 1),
          genreId: randomUUID(),
        },
      },
    });

    const validateUpdateMovieSpy = ctx.mock.fn(validator.validateUpdateMovie);

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
  await test('Invalid - Update validation: Description too long', (ctx) => {
    const { request } = createHttpMocks<ResponseWithCtx>({
      logger,
      reqOptions: {
        params: { movieId: randomUUID() },
        body: {
          description: 'a'.repeat(MOVIE.DESCRIPTION.MAX_LENGTH.VALUE + 1),
          genreId: randomUUID(),
        },
      },
    });

    const validateUpdateMovieSpy = ctx.mock.fn(validator.validateUpdateMovie);

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
  await test('Invalid - Update validation: Empty image path', (ctx) => {
    const { request } = createHttpMocks<ResponseWithCtx>({
      logger,
      reqOptions: {
        params: { movieId: randomUUID() },
        body: { imagePath: '', genreId: randomUUID() },
      },
    });

    const validateUpdateMovieSpy = ctx.mock.fn(validator.validateUpdateMovie);

    assert.throws(
      () => {
        validateUpdateMovieSpy(request);
      },
      (err) => {
        assert.strictEqual(err instanceof MRSError, true);
        assert.deepStrictEqual((err as MRSError).getClientError(), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: `${MOVIE.IMAGE_PATH.MIN_LENGTH.ERROR_MESSAGE}, ${MOVIE.IMAGE_PATH.ERROR_MESSAGE}`,
        });

        return true;
      },
    );
  });
  await test('Invalid - Update validation: Image path too short', (ctx) => {
    const { request } = createHttpMocks<ResponseWithCtx>({
      logger,
      reqOptions: {
        params: { movieId: randomUUID() },
        body: {
          imagePath: 'a'.repeat(MOVIE.IMAGE_PATH.MIN_LENGTH.VALUE - 1),
          genreId: randomUUID(),
        },
      },
    });

    const validateUpdateMovieSpy = ctx.mock.fn(validator.validateUpdateMovie);

    assert.throws(
      () => {
        validateUpdateMovieSpy(request);
      },
      (err) => {
        assert.strictEqual(err instanceof MRSError, true);
        assert.deepStrictEqual((err as MRSError).getClientError(), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: `${MOVIE.IMAGE_PATH.MIN_LENGTH.ERROR_MESSAGE}, ${MOVIE.IMAGE_PATH.ERROR_MESSAGE}`,
        });

        return true;
      },
    );
  });
  await test('Invalid - Update validation: Image path too long', (ctx) => {
    const { request } = createHttpMocks<ResponseWithCtx>({
      logger,
      reqOptions: {
        params: { movieId: randomUUID() },
        body: {
          imagePath: `${'a'.repeat(MOVIE.IMAGE_PATH.MAX_LENGTH.VALUE + 1)}@ph.com`,
          genreId: randomUUID(),
        },
      },
    });

    const validateUpdateMovieSpy = ctx.mock.fn(validator.validateUpdateMovie);

    assert.throws(
      () => {
        validateUpdateMovieSpy(request);
      },
      (err) => {
        assert.strictEqual(err instanceof MRSError, true);
        assert.deepStrictEqual((err as MRSError).getClientError(), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: MOVIE.IMAGE_PATH.MAX_LENGTH.ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Update validation: Invalid image path', (ctx) => {
    const { request } = createHttpMocks<ResponseWithCtx>({
      logger,
      reqOptions: {
        params: { movieId: randomUUID() },
        body: { imagePath: randomString(32), genreId: randomUUID() },
      },
    });

    const validateUpdateMovieSpy = ctx.mock.fn(validator.validateUpdateMovie);

    assert.throws(
      () => {
        validateUpdateMovieSpy(request);
      },
      (err) => {
        assert.strictEqual(err instanceof MRSError, true);
        assert.deepStrictEqual((err as MRSError).getClientError(), {
          code: HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
          message: MOVIE.IMAGE_PATH.ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Update validation: Empty price', (ctx) => {
    const { request } = createHttpMocks<ResponseWithCtx>({
      logger,
      reqOptions: {
        params: { movieId: randomUUID() },
        body: { price: '', genreId: randomUUID() },
      },
    });

    const validateUpdateMovieSpy = ctx.mock.fn(validator.validateUpdateMovie);

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
  await test('Invalid - Update validation: Price too low', (ctx) => {
    const { request } = createHttpMocks<ResponseWithCtx>({
      logger,
      reqOptions: {
        params: { movieId: randomUUID() },
        body: {
          price: MOVIE.PRICE.MIN_VALUE.VALUE - 1,
          genreId: randomUUID(),
        },
      },
    });

    const validateUpdateMovieSpy = ctx.mock.fn(validator.validateUpdateMovie);

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
  await test('Invalid - Update validation: Price too high', (ctx) => {
    const { request } = createHttpMocks<ResponseWithCtx>({
      logger,
      reqOptions: {
        params: { movieId: randomUUID() },
        body: {
          price: MOVIE.PRICE.MAX_VALUE.VALUE + 1,
          genreId: randomUUID(),
        },
      },
    });

    const validateUpdateMovieSpy = ctx.mock.fn(validator.validateUpdateMovie);

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
  await test('Invalid - Update validation: Empty genre id', (ctx) => {
    const { request } = createHttpMocks<ResponseWithCtx>({
      logger,
      reqOptions: {
        params: { movieId: randomUUID() },
        body: { title: randomString(), genreId: '' },
      },
    });

    const validateUpdateMovieSpy = ctx.mock.fn(validator.validateUpdateMovie);

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
  await test('Invalid - Update validation: Invalid genre id', (ctx) => {
    const { request } = createHttpMocks<ResponseWithCtx>({
      logger,
      reqOptions: {
        params: { movieId: randomUUID() },
        body: { title: randomString(), genreId: randomString() },
      },
    });

    const validateUpdateMovieSpy = ctx.mock.fn(validator.validateUpdateMovie);

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
        await service.updateMovie(
          {
            authentication: serverParams.authentication,
            database: serverParams.database,
            logger,
          },
          {
            movieId,
            title: randomString(16),
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
    const updatedGenreId = randomUUID();

    await seedMovie(serverParams, async (movie) => {
      await assert.rejects(
        async () => {
          await service.updateMovie(
            {
              authentication: serverParams.authentication,
              database: serverParams.database,
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
    });
  });
  await test('Invalid - Delete validation: Missing id', (ctx) => {
    const { request } = createHttpMocks<ResponseWithCtx>({
      logger,
    });

    const validateDeleteMovieSpy = ctx.mock.fn(validator.validateDeleteMovie);

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
  await test('Invalid - Delete validation: Empty id', (ctx) => {
    const { request } = createHttpMocks<ResponseWithCtx>({
      logger,
      reqOptions: { params: { movieId: '' } },
    });

    const validateDeleteMovieSpy = ctx.mock.fn(validator.validateDeleteMovie);

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
  await test('Invalid - Delete validation: Invalid id', (ctx) => {
    const { request } = createHttpMocks<ResponseWithCtx>({
      logger,
      reqOptions: { params: { movieId: randomString() } },
    });

    const validateDeleteMovieSpy = ctx.mock.fn(validator.validateDeleteMovie);

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
