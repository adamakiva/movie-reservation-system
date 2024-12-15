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

import { generateMoviesData, seedMovie, seedMovies } from './utils.js';

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
  await test('Invalid - Create validation: Missing first name', (ctx) => {
    const { request } = createHttpMocks<ResponseWithCtx>({
      logger,
      reqOptions: {
        body: {
          ...generateMoviesData([randomUUID()], 1),
          firstName: undefined,
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
          message: MOVIE.FIRST_NAME.REQUIRED_ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Create validation: Empty first name', (ctx) => {
    const { request } = createHttpMocks<ResponseWithCtx>({
      logger,
      reqOptions: {
        body: {
          ...generateMoviesData([randomUUID()], 1),
          firstName: '',
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
          message: MOVIE.FIRST_NAME.MIN_LENGTH.ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Create validation: First name too short', (ctx) => {
    const { request } = createHttpMocks<ResponseWithCtx>({
      logger,
      reqOptions: {
        body: {
          ...generateMoviesData([randomUUID()], 1),
          firstName: 'a'.repeat(MOVIE.FIRST_NAME.MIN_LENGTH.VALUE - 1),
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
          message: MOVIE.FIRST_NAME.MIN_LENGTH.ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Create validation: First name too long', (ctx) => {
    const { request } = createHttpMocks<ResponseWithCtx>({
      logger,
      reqOptions: {
        body: {
          ...generateMoviesData([randomUUID()], 1),
          firstName: 'a'.repeat(MOVIE.FIRST_NAME.MAX_LENGTH.VALUE + 1),
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
          message: MOVIE.FIRST_NAME.MAX_LENGTH.ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Create validation: Missing last name', (ctx) => {
    const { request } = createHttpMocks<ResponseWithCtx>({
      logger,
      reqOptions: {
        body: {
          ...generateMoviesData([randomUUID()], 1),
          lastName: undefined,
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
          message: MOVIE.LAST_NAME.REQUIRED_ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Create validation: Empty last name', (ctx) => {
    const { request } = createHttpMocks<ResponseWithCtx>({
      logger,
      reqOptions: {
        body: {
          ...generateMoviesData([randomUUID()], 1),
          lastName: '',
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
          message: MOVIE.LAST_NAME.MIN_LENGTH.ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Create validation: Last name too short', (ctx) => {
    const { request } = createHttpMocks<ResponseWithCtx>({
      logger,
      reqOptions: {
        body: {
          ...generateMoviesData([randomUUID()], 1),
          lastName: 'a'.repeat(MOVIE.LAST_NAME.MIN_LENGTH.VALUE - 1),
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
          message: MOVIE.LAST_NAME.MIN_LENGTH.ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Create validation: Last name too long', (ctx) => {
    const { request } = createHttpMocks<ResponseWithCtx>({
      logger,
      reqOptions: {
        body: {
          ...generateMoviesData([randomUUID()], 1),
          lastName: 'a'.repeat(MOVIE.LAST_NAME.MAX_LENGTH.VALUE + 1),
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
          message: MOVIE.LAST_NAME.MAX_LENGTH.ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Create validation: Missing email', (ctx) => {
    const { request } = createHttpMocks<ResponseWithCtx>({
      logger,
      reqOptions: {
        body: {
          ...generateMoviesData([randomUUID()], 1),
          email: undefined,
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
          message: MOVIE.EMAIL.REQUIRED_ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Create validation: Empty email', (ctx) => {
    const { request } = createHttpMocks<ResponseWithCtx>({
      logger,
      reqOptions: {
        body: {
          ...generateMoviesData([randomUUID()], 1),
          email: '',
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
          message: `${MOVIE.EMAIL.MIN_LENGTH.ERROR_MESSAGE}, ${MOVIE.EMAIL.ERROR_MESSAGE}`,
        });

        return true;
      },
    );
  });
  await test('Invalid - Create validation: Email too short', (ctx) => {
    const { request } = createHttpMocks<ResponseWithCtx>({
      logger,
      reqOptions: {
        body: {
          ...generateMoviesData([randomUUID()], 1),
          email: 'a'.repeat(MOVIE.EMAIL.MIN_LENGTH.VALUE - 1),
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
          message: `${MOVIE.EMAIL.MIN_LENGTH.ERROR_MESSAGE}, ${MOVIE.EMAIL.ERROR_MESSAGE}`,
        });

        return true;
      },
    );
  });
  await test('Invalid - Create validation: Email too long', (ctx) => {
    const { request } = createHttpMocks<ResponseWithCtx>({
      logger,
      reqOptions: {
        body: {
          ...generateMoviesData([randomUUID()], 1),
          email: `${'a'.repeat(MOVIE.EMAIL.MAX_LENGTH.VALUE + 1)}@ph.com`,
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
          message: MOVIE.EMAIL.MAX_LENGTH.ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Create validation: Invalid email', (ctx) => {
    const { request } = createHttpMocks<ResponseWithCtx>({
      logger,
      reqOptions: {
        body: {
          ...generateMoviesData([randomUUID()], 1),
          email: randomString(),
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
          message: MOVIE.EMAIL.ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Create validation: Missing password', (ctx) => {
    const { request } = createHttpMocks<ResponseWithCtx>({
      logger,
      reqOptions: {
        body: {
          ...generateMoviesData([randomUUID()], 1),
          password: undefined,
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
          message: MOVIE.PASSWORD.REQUIRED_ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Create validation: Empty password', (ctx) => {
    const { request } = createHttpMocks<ResponseWithCtx>({
      logger,
      reqOptions: {
        body: {
          ...generateMoviesData([randomUUID()], 1),
          password: '',
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
          message: MOVIE.PASSWORD.MIN_LENGTH.ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Create validation: Password too short', (ctx) => {
    const { request } = createHttpMocks<ResponseWithCtx>({
      logger,
      reqOptions: {
        body: {
          ...generateMoviesData([randomUUID()], 1),
          password: 'a'.repeat(MOVIE.PASSWORD.MIN_LENGTH.VALUE - 1),
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
          message: MOVIE.PASSWORD.MIN_LENGTH.ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Create validation: Password too long', (ctx) => {
    const { request } = createHttpMocks<ResponseWithCtx>({
      logger,
      reqOptions: {
        body: {
          ...generateMoviesData([randomUUID()], 1),
          password: 'a'.repeat(MOVIE.PASSWORD.MAX_LENGTH.VALUE + 1),
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
          message: MOVIE.PASSWORD.MAX_LENGTH.ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Create validation: Missing role id', (ctx) => {
    const { request } = createHttpMocks<ResponseWithCtx>({
      logger,
      reqOptions: {
        body: {
          ...generateMoviesData([randomUUID()], 1),
          roleId: undefined,
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
          message: MOVIE.ROLE_ID.REQUIRED_ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Create validation: Empty role id', (ctx) => {
    const { request } = createHttpMocks<ResponseWithCtx>({
      logger,
      reqOptions: {
        body: {
          ...generateMoviesData([randomUUID()], 1),
          roleId: '',
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
          message: MOVIE.ROLE_ID.ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Create validation: Invalid role id', (ctx) => {
    const { request } = createHttpMocks<ResponseWithCtx>({
      logger,
      reqOptions: {
        body: {
          ...generateMoviesData([randomUUID()], 1),
          roleId: randomString(),
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
          message: MOVIE.ROLE_ID.ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Create service: Duplicate entry', async () => {
    await seedMovie(serverParams, true, async (movie, role) => {
      await assert.rejects(
        async () => {
          await service.createMovie(
            {
              authentication: serverParams.authentication,
              database: serverParams.database,
              logger,
            },
            {
              ...generateMoviesData([role.id], 1),
              email: movie.email,
            },
          );
        },
        (err) => {
          assert.strictEqual(err instanceof MRSError, true);
          assert.deepStrictEqual((err as MRSError).getClientError(), {
            code: HTTP_STATUS_CODES.CONFLICT,
            message: `Movie '${movie.email}' already exists`,
          });

          return true;
        },
      );
    });
  });
  await test('Invalid - Create service: Non-existent role id', async () => {
    const roleId = randomUUID();

    await assert.rejects(
      async () => {
        await service.createMovie(
          {
            authentication: serverParams.authentication,
            database: serverParams.database,
            logger,
          },
          generateMoviesData([roleId], 1),
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
  await test('Invalid - Update validation - Without updates', (ctx) => {
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
      reqOptions: { body: { roleId: randomUUID() } },
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
        body: { roleId: randomUUID() },
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
        body: { roleId: randomUUID() },
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
  await test('Invalid - Update validation: Empty first name', (ctx) => {
    const { request } = createHttpMocks<ResponseWithCtx>({
      logger,
      reqOptions: {
        params: { movieId: randomUUID() },
        body: { firstName: '', roleId: randomUUID() },
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
          message: MOVIE.FIRST_NAME.MIN_LENGTH.ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Update validation: First name too short', (ctx) => {
    const { request } = createHttpMocks<ResponseWithCtx>({
      logger,
      reqOptions: {
        params: { movieId: randomUUID() },
        body: {
          firstName: 'a'.repeat(MOVIE.FIRST_NAME.MIN_LENGTH.VALUE - 1),
          roleId: randomUUID(),
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
          message: MOVIE.FIRST_NAME.MIN_LENGTH.ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Update validation: First name too long', (ctx) => {
    const { request } = createHttpMocks<ResponseWithCtx>({
      logger,
      reqOptions: {
        params: { movieId: randomUUID() },
        body: {
          firstName: 'a'.repeat(MOVIE.FIRST_NAME.MAX_LENGTH.VALUE + 1),
          roleId: randomUUID(),
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
          message: MOVIE.FIRST_NAME.MAX_LENGTH.ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Update validation: Empty last name', (ctx) => {
    const { request } = createHttpMocks<ResponseWithCtx>({
      logger,
      reqOptions: {
        params: { movieId: randomUUID() },
        body: { lastName: '', roleId: randomUUID() },
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
          message: MOVIE.LAST_NAME.MIN_LENGTH.ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Update validation: Last name too short', (ctx) => {
    const { request } = createHttpMocks<ResponseWithCtx>({
      logger,
      reqOptions: {
        params: { movieId: randomUUID() },
        body: {
          lastName: 'a'.repeat(MOVIE.LAST_NAME.MIN_LENGTH.VALUE - 1),
          roleId: randomUUID(),
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
          message: MOVIE.LAST_NAME.MIN_LENGTH.ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Update validation: Last name too long', (ctx) => {
    const { request } = createHttpMocks<ResponseWithCtx>({
      logger,
      reqOptions: {
        params: { movieId: randomUUID() },
        body: {
          lastName: 'a'.repeat(MOVIE.LAST_NAME.MAX_LENGTH.VALUE + 1),
          roleId: randomUUID(),
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
          message: MOVIE.LAST_NAME.MAX_LENGTH.ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Update validation: Empty email', (ctx) => {
    const { request } = createHttpMocks<ResponseWithCtx>({
      logger,
      reqOptions: {
        params: { movieId: randomUUID() },
        body: { email: '', roleId: randomUUID() },
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
          message: `${MOVIE.EMAIL.MIN_LENGTH.ERROR_MESSAGE}, ${MOVIE.EMAIL.ERROR_MESSAGE}`,
        });

        return true;
      },
    );
  });
  await test('Invalid - Update validation: Email too short', (ctx) => {
    const { request } = createHttpMocks<ResponseWithCtx>({
      logger,
      reqOptions: {
        params: { movieId: randomUUID() },
        body: {
          email: 'a'.repeat(MOVIE.EMAIL.MIN_LENGTH.VALUE - 1),
          roleId: randomUUID(),
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
          message: `${MOVIE.EMAIL.MIN_LENGTH.ERROR_MESSAGE}, ${MOVIE.EMAIL.ERROR_MESSAGE}`,
        });

        return true;
      },
    );
  });
  await test('Invalid - Update validation: Email too long', (ctx) => {
    const { request } = createHttpMocks<ResponseWithCtx>({
      logger,
      reqOptions: {
        params: { movieId: randomUUID() },
        body: {
          email: `${'a'.repeat(MOVIE.EMAIL.MAX_LENGTH.VALUE + 1)}@ph.com`,
          roleId: randomUUID(),
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
          message: MOVIE.EMAIL.MAX_LENGTH.ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Update validation: Invalid email', (ctx) => {
    const { request } = createHttpMocks<ResponseWithCtx>({
      logger,
      reqOptions: {
        params: { movieId: randomUUID() },
        body: { email: randomString(32), roleId: randomUUID() },
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
          message: MOVIE.EMAIL.ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Update validation: Empty password', (ctx) => {
    const { request } = createHttpMocks<ResponseWithCtx>({
      logger,
      reqOptions: {
        params: { movieId: randomUUID() },
        body: { password: '', roleId: randomUUID() },
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
          message: MOVIE.PASSWORD.MIN_LENGTH.ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Update validation: Password too short', (ctx) => {
    const { request } = createHttpMocks<ResponseWithCtx>({
      logger,
      reqOptions: {
        params: { movieId: randomUUID() },
        body: {
          password: 'a'.repeat(MOVIE.PASSWORD.MIN_LENGTH.VALUE - 1),
          roleId: randomUUID(),
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
          message: MOVIE.PASSWORD.MIN_LENGTH.ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Update validation: Password too long', (ctx) => {
    const { request } = createHttpMocks<ResponseWithCtx>({
      logger,
      reqOptions: {
        params: { movieId: randomUUID() },
        body: {
          password: 'a'.repeat(MOVIE.PASSWORD.MAX_LENGTH.VALUE + 1),
          roleId: randomUUID(),
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
          message: MOVIE.PASSWORD.MAX_LENGTH.ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Update validation: Empty role id', (ctx) => {
    const { request } = createHttpMocks<ResponseWithCtx>({
      logger,
      reqOptions: {
        params: { movieId: randomUUID() },
        body: { firstName: randomString(), roleId: '' },
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
          message: MOVIE.ROLE_ID.ERROR_MESSAGE,
        });

        return true;
      },
    );
  });
  await test('Invalid - Update validation: Invalid role id', (ctx) => {
    const { request } = createHttpMocks<ResponseWithCtx>({
      logger,
      reqOptions: {
        params: { movieId: randomUUID() },
        body: { firstName: randomString(), roleId: randomString() },
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
          message: MOVIE.ROLE_ID.ERROR_MESSAGE,
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
            firstName: randomString(16),
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
  await test('Invalid - Update service: Duplicate entry', async () => {
    await seedMovies(serverParams, 2, false, async (movies) => {
      await assert.rejects(
        async () => {
          await service.updateMovie(
            {
              authentication: serverParams.authentication,
              database: serverParams.database,
              logger,
            },
            {
              movieId: movies[0]!.id,
              email: movies[1]!.email,
            },
          );
        },
        (err) => {
          assert.strictEqual(err instanceof MRSError, true);
          assert.deepStrictEqual((err as MRSError).getClientError(), {
            code: HTTP_STATUS_CODES.CONFLICT,
            message: `Movie '${movies[1]!.email}' already exists`,
          });

          return true;
        },
      );
    });
  });
  await test('Invalid - Update service: Non-existent role id', async () => {
    const updatedRoleId = randomUUID();

    await seedMovie(serverParams, true, async (movie) => {
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
