/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-return */

import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import { randomUUID as nodeRandomUUID } from 'node:crypto';
import type { PathLike } from 'node:fs';
import { readdir, readFile, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, before, mock, suite, test } from 'node:test';

import {
  ERROR_CODES,
  HTTP_STATUS_CODES,
} from '@adamakiva/movie-reservation-system-shared';
import { argon2i, hash } from 'argon2';
import { eq, getTableName, sql } from 'drizzle-orm';
import type { NextFunction, Request, Response } from 'express';
import { fileTypeFromFile } from 'file-type';
import {
  createRequest,
  createResponse,
  type RequestOptions,
  type ResponseOptions,
} from 'node-mocks-http';
import pg from 'postgres';
import { WebSocket } from 'ws';

import type { Database } from '../database/index.ts';
import { AUTHENTICATION } from '../entities/authentication/validator.ts';
import type { Genre } from '../entities/genre/service/utils.ts';
import { GENRE } from '../entities/genre/validator.ts';
import type { Hall } from '../entities/hall/service/utils.ts';
import { HALL } from '../entities/hall/validator.ts';
import type { Movie } from '../entities/movie/service/utils.ts';
import { MOVIE } from '../entities/movie/validator.ts';
import type { Role } from '../entities/role/service/utils.ts';
import { ROLE } from '../entities/role/validator.ts';
import type { Showtime } from '../entities/showtime/service/utils.ts';
import { SHOWTIME } from '../entities/showtime/validator.ts';
import type { User } from '../entities/user/service/utils.ts';
import { USER } from '../entities/user/validator.ts';
import { VALIDATION } from '../entities/utils.ts';
import { HttpServer } from '../server/index.ts';
import * as Middlewares from '../server/middlewares/index.ts';
import { EnvironmentManager } from '../utils/config.ts';
import { GeneralError } from '../utils/errors.ts';
import { Logger } from '../utils/logger.ts';
import type {
  DatabaseHandler,
  DatabaseModel,
  PaginatedResult,
} from '../utils/types.ts';

/**********************************************************************************/

type ServerParams = Awaited<ReturnType<typeof initServer>>;

type ResponseType<
  RT extends 'bytes' | 'json' | 'text' = 'bytes',
  R = any,
> = RT extends 'bytes'
  ? // See: https://stackoverflow.com/a/66629140
    { statusCode: number; responseBody: Uint8Array }
  : RT extends 'text'
    ? { statusCode: number; responseBody: string }
    : { statusCode: number; responseBody: R };

// To make sure the tests don't miss anything, not even warnings
process.on('warning', (warn) => {
  console.error(warn);

  process.exit(1);
});

const CONSTANTS = {
  ONE_MEGABYTE: 1_000_000,
  EIGHT_MEGABYTES: 8_000_000,
  SINGLE_PAGE: {
    CREATE: 32,
    SIZE: 32,
  },
  MULTIPLE_PAGES: {
    CREATE: 512,
    SIZE: 8,
  },
  LOT_OF_PAGES: {
    CREATE: 2_048,
    SIZE: 8,
  },
  ALPHA_NUMERIC: {
    CHARACTERS:
      'ABCDEABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789',
    LENGTH: 67,
  },
} as const;

const { PostgresError } = pg;

/***************************** Server setup ***************************************/
/**********************************************************************************/

async function initServer() {
  const logger = mockLogger();

  const {
    node: nodeEnv,
    jwt: jwtEnv,
    httpServer: httpServerEnv,
    websocketServer: websocketServerEnv,
    database: databaseEnv,
    messageQueue: messageQueueEnv,
    adminRoleId,
  } = new EnvironmentManager(logger).getEnvVariables();

  const server = await HttpServer.create({
    authenticationParams: {
      audience: 'mrs-users',
      issuer: 'mrs-server',
      type: 'JWT',
      algorithm: 'RS256',
      access: {
        expiresAt: jwtEnv.accessTokenExpiration,
      },
      refresh: {
        expiresAt: jwtEnv.refreshTokenExpiration,
      },
      keysPath: join(import.meta.dirname, '..', '..', 'keys'),
      hashSecret: jwtEnv.hash,
    },
    databaseParams: {
      url: databaseEnv.url,
      options: {
        max: databaseEnv.maxConnections,
        connection: {
          statement_timeout: databaseEnv.statementTimeout,
          idle_in_transaction_session_timeout: databaseEnv.transactionTimeout,
        },
      },
      // Alive vs Readiness check boils down to:
      // Should we restart the pod OR redirect the traffic to a different pod
      isAliveQuery: 'SELECT NOW()',
      isReadyQuery: 'SELECT NOW()',
    },
    fileManagerParams: {
      generatedFileNameLength: 32,
      saveDir: tmpdir(),
      highWatermark: nodeEnv.defaultHighWaterMark,
      pipeTimeout: nodeEnv.pipeTimeout,
      limits: {
        fileSize: 4_194_304, // 4mb
        files: 1, // Currently only 1 file is expected, change if needed
      },
    },
    cronjobParams: {
      moviePosterCleanupParams: {
        directory: tmpdir(),
        retryInterval: 2_000,
        retryLimit: 3,
      },
    },
    messageQueueParams: messageQueueEnv,
    websocketServerParams: {
      path: `/${websocketServerEnv.route}`,
      pingTime: websocketServerEnv.pingTime,
      options: {
        backlog: websocketServerEnv.backlog,
        maxPayload: websocketServerEnv.maxPayload,
      },
    },
    allowedMethods: httpServerEnv.allowedMethods,
    routes: {
      http: `/${httpServerEnv.route}`,
    },
    httpServerConfigurations: httpServerEnv.configurations,
    adminRoleId,
    logger,
  });

  const port = await server.listen();
  const baseUrl = `http://localhost:${port}`;

  return {
    server,
    maxRequestsPerSocket: httpServerEnv.configurations.maxRequestsPerSocket,
    authentication: server.getAuthenticationManager(),
    fileManager: server.getFileManager(),
    database: server.getDatabase(),
    messageQueue: server.getMessageQueue(),
    websocketServer: server.getWebsocketServer(),
    routes: {
      base: baseUrl,
      http: `${baseUrl}/${httpServerEnv.route}`,
      websocket: `${baseUrl}/${websocketServerEnv.route}`,
    },
    logger,
  } as const;
}

async function terminateServer(server: HttpServer, database: Database) {
  try {
    await clearDatabase(database);
    await server.close();
  } catch (error) {
    console.error('Failure to cleanup tests:', error);
    process.exit(1);
  }
}

/**********************************************************************************/

async function clearDatabase(database: Database) {
  const handler = database.getHandler();
  const models = database.getModels();

  const queryParts = Object.values(models)
    .map((model) => {
      return `"${getTableName(model)}"`;
    })
    .join(', ');
  await handler.execute(sql.raw(`TRUNCATE ${queryParts} CASCADE;`));

  await recreateAdminRoleAndUser(handler, {
    role: models.role,
    user: models.user,
  });
}

async function recreateAdminRoleAndUser(
  handler: DatabaseHandler,
  models: { role: DatabaseModel<'role'>; user: DatabaseModel<'user'> },
) {
  const { role: roleModel, user: userModel } = models;

  // Don't promise.all this, the role has to be created before the user
  await handler
    .insert(roleModel)
    .values({
      id: process.env.ADMIN_ROLE_ID!,
      name: process.env.ADMIN_ROLE_NAME!,
    })
    .onConflictDoNothing();
  await handler
    .insert(userModel)
    .values({
      firstName: 'admin',
      lastName: 'admin',
      email: process.env.ADMIN_EMAIL!,
      hash: await hash(process.env.ADMIN_PASSWORD!, {
        type: argon2i,
        secret: Buffer.from(process.env.AUTHENTICATION_HASH_SECRET!),
      }),
      roleId: process.env.ADMIN_ROLE_ID!,
    })
    .onConflictDoNothing();
}

/***************************** General utils **************************************/
/**********************************************************************************/

/**
 * Including min, excluding max
 */
function randomNumber(min = 0, max = 9) {
  return Math.floor(Math.random() * (max - min)) + min;
}

function randomUUID<T extends number = 1>(
  amount = 1 as T,
): T extends 1 ? string : string[] {
  const uuids = [...Array<string>(amount)].map(() => {
    return nodeRandomUUID();
  });

  return (amount === 1 ? uuids[0] : uuids) as T extends 1 ? string : string[];
}

function randomAlphaNumericString(len = 32) {
  let str = '';
  for (let i = 0; i < len; ++i) {
    str += CONSTANTS.ALPHA_NUMERIC.CHARACTERS.charAt(
      Math.floor(Math.random() * CONSTANTS.ALPHA_NUMERIC.LENGTH),
    );
  }

  return str;
}

/******************************* API calls ****************************************/
/**********************************************************************************/

async function sendHttpRequest<
  M extends 'HEAD' | 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' = 'GET',
  RT extends 'bytes' | 'json' | 'text' = 'bytes',
  R = any,
>(params: {
  route: string;
  method: M;
  responseType: RT;
  payload?: M extends 'HEAD' | 'GET' | 'DELETE' ? never : unknown;
  headers?: HeadersInit;
}): Promise<ResponseType<RT, R>> {
  const { route, method, responseType, payload } = params;

  const headers = !(payload instanceof FormData)
    ? ({ ...params.headers, 'Content-Type': 'application/json' } as const)
    : ({ ...params.headers } as const);

  const fetchOptions: RequestInit = {
    method,
    cache: 'no-store',
    mode: 'same-origin',
    body: payload instanceof FormData ? payload : JSON.stringify(payload),
    headers,
    redirect: 'manual',
    window: null,
  } as const;

  const fetchResponse = await fetch(route, fetchOptions);
  const statusCode = fetchResponse.status;

  if (!fetchResponse.ok) {
    return {
      statusCode,
      responseBody: await fetchResponse.text(),
    } as const as ResponseType<RT, R>;
  }

  switch (responseType) {
    case 'bytes': {
      return {
        statusCode,
        responseBody: await fetchResponse[responseType as 'bytes'](),
      } as const as ResponseType<RT, R>;
    }
    case 'json':
    case 'text': {
      return {
        statusCode: fetchResponse.status,
        responseBody:
          await fetchResponse[
            // False-positive, we deduct an option from the generic param
            // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
            responseType as 'json' | 'text'
          ](),
      } as const as ResponseType<RT, R>;
    }
    default: {
      throw new Error('Should never happen');
    }
  }
}

function createWebsocketClient(
  websocketRoute: ServerParams['routes']['websocket'],
  accessToken: string,
) {
  return new WebSocket(
    `${websocketRoute}?auth_token=${Buffer.from(accessToken).toString('base64')}`,
  );
}

async function getAdminTokens(httpRoute: ServerParams['routes']['http']) {
  const email = process.env.ADMIN_EMAIL!;
  const password = process.env.ADMIN_PASSWORD!;

  const tokens = await generateTokens({ httpRoute, email, password });

  return tokens as { accessToken: string; refreshToken: string };
}

async function generateTokens(params: {
  httpRoute: ServerParams['routes']['http'];
  email: string;
  password: string;
}) {
  const { httpRoute, email, password } = params;

  const { statusCode, responseBody } = await sendHttpRequest<'POST', 'json'>({
    route: `${httpRoute}/login`,
    method: 'POST',
    payload: { email, password },
    responseType: 'json',
  });
  assert.strictEqual(statusCode, HTTP_STATUS_CODES.CREATED);

  return await responseBody;
}

/**********************************************************************************/
/********************************** Seed ******************************************/

type CreateGenre = Omit<Genre, 'id'>;
type CreateHall = Omit<Hall, 'id'>;
type CreateMovie = {
  title: string;
  description: string;
  price: number;
  poster: CreateMoviePoster;
  genreId: string;
};
type CreateMoviePoster = {
  absolutePath: string;
  mimeType: string;
  sizeInBytes: number;
};
type CreateRole = Omit<Role, 'id'>;
type CreateShowtime = { at: Date };
type CreateUser = Omit<User, 'id' | 'role'> & {
  password: string;
  roleId: string;
};

/**********************************************************************************/

async function seedGenre(database: ServerParams['database']) {
  const [createdGenre] = await seedGenres(database, 1);

  return createdGenre!;
}

async function seedGenres(database: ServerParams['database'], amount: number) {
  const handler = database.getHandler();
  const { genre: genreModel } = database.getModels();

  const genresToCreate = generateGenresData(amount);

  const createdGenres = await handler
    .insert(genreModel)
    .values(genresToCreate)
    .returning({ id: genreModel.id, name: genreModel.name });

  return createdGenres;
}

function generateGenresData(amount = 1) {
  const genres = [...Array<CreateGenre>(amount)].map(() => {
    return {
      name: randomAlphaNumericString(GENRE.NAME.MAX_LENGTH.VALUE - 1),
    } as const satisfies CreateGenre;
  });

  return genres;
}

async function seedHall(database: ServerParams['database']) {
  const [createdHall] = await seedHalls(database, 1);

  return createdHall!;
}

async function seedHalls(database: ServerParams['database'], amount: number) {
  const handler = database.getHandler();
  const { hall: hallModel } = database.getModels();

  const hallsToCreate = generateHallsData(amount);

  const createdHalls = await handler
    .insert(hallModel)
    .values(hallsToCreate)
    .returning({
      id: hallModel.id,
      name: hallModel.name,
      rows: hallModel.rows,
      columns: hallModel.columns,
    });

  return createdHalls;
}

function generateHallsData(amount = 1) {
  const halls = [...Array<CreateHall>(amount)].map(() => {
    return {
      name: randomAlphaNumericString(HALL.NAME.MAX_LENGTH.VALUE - 1),
      rows: randomNumber(
        HALL.ROWS.MIN_LENGTH.VALUE + 1,
        HALL.ROWS.MAX_LENGTH.VALUE - 1,
      ),
      columns: randomNumber(
        HALL.COLUMNS.MIN_LENGTH.VALUE + 1,
        HALL.COLUMNS.MAX_LENGTH.VALUE - 1,
      ),
    } as const satisfies CreateHall;
  });

  return halls;
}

async function seedMovie(database: ServerParams['database']) {
  const { createdMovies, createdGenres, createdMoviePosters } =
    await seedMovies(database, 1);

  return {
    createdMovie: createdMovies[0]!,
    createdGenre: createdGenres[0]!,
    createdMoviePoster: createdMoviePosters[0]!,
  } as const;
}

async function seedMovies(
  database: ServerParams['database'],
  amount: number,
  ratio = amount / 6,
) {
  const handler = database.getHandler();
  const { movie: movieModel, moviePoster: moviePosterModel } =
    database.getModels();

  const moviesToCreate = generateMoviesData(amount);
  // Pay attention that this only generate a single role for a single user for
  // a proper cleanup of the 'seedUser' function
  const createdGenres = await seedGenres(database, Math.ceil(amount / ratio));
  const now = new Date();
  try {
    const createdEntities = await handler.transaction(async (transaction) => {
      const createdMovies = await transaction
        .insert(movieModel)
        .values(
          moviesToCreate.map((movieToCreate) => {
            return {
              ...movieToCreate,
              genreId:
                createdGenres[randomNumber(0, createdGenres.length - 1)]!.id,
              createdAt: now,
              updatedAt: now,
            } as const;
          }),
        )
        .returning({
          id: movieModel.id,
          title: movieModel.title,
          description: movieModel.description,
          price: movieModel.price,
          genreId: movieModel.genreId,
        });

      const moviePostersData = await generateMoviePostersData();
      const createdMoviePosters = await transaction
        .insert(moviePosterModel)
        .values(
          createdMovies.map(({ id: movieId }) => {
            return {
              movieId,
              ...moviePostersData[moviePostersData.length - 1]!,
              createdAt: now,
              updatedAt: now,
            } as const;
          }),
        )
        .returning({
          absolutePath: moviePosterModel.absolutePath,
          mimeType: moviePosterModel.mimeType,
          sizeInBytes: moviePosterModel.sizeInBytes,
        });

      return {
        createdMovies,
        createdMoviePosters,
      } as const;
    });

    const createdMovies = createdEntities.createdMovies.map((createdMovie) => {
      const { genreId, ...fields } = createdMovie;
      const genreName = createdGenres.find((genre) => {
        return genre.id === genreId;
      })!.name;

      return {
        ...fields,
        genre: genreName,
      } as const;
    });

    return {
      createdGenres,
      createdMovies,
      createdMoviePosters: createdEntities.createdMoviePosters,
    } as const;
  } catch (error) {
    await clearDatabase(database);

    throw error;
  }
}

function generateMoviesData(amount = 1) {
  const movies = [
    ...Array<Omit<CreateMovie, 'poster' | 'genreId'>>(amount),
  ].map(() => {
    return {
      title: randomAlphaNumericString(MOVIE.TITLE.MIN_LENGTH.VALUE + 1),
      description: randomAlphaNumericString(
        MOVIE.DESCRIPTION.MIN_LENGTH.VALUE + 1,
      ),
      price: randomNumber(
        MOVIE.PRICE.MIN_VALUE.VALUE + 1,
        MOVIE.PRICE.MAX_VALUE.VALUE - 1,
      ),
    } as const satisfies Omit<CreateMovie, 'poster' | 'genreId'>;
  });

  return movies;
}

async function generateMovieDataIncludingPoster(genreId?: string) {
  const imageNames = await readdir(join(import.meta.dirname, 'images'));
  const moviePosters = await Promise.all(
    imageNames.map(async (imageName) => {
      const absolutePath = join(import.meta.dirname, 'images', imageName);
      const { size: sizeInBytes } = await stat(absolutePath);

      return {
        path: absolutePath,
        mimeType: (await fileTypeFromFile(absolutePath))!.mime,
        size: sizeInBytes,
      } as const;
    }),
  );

  return {
    ...generateMoviesData(1)[0]!,
    poster: moviePosters[randomNumber(0, moviePosters.length - 1)]!,
    genreId: genreId ?? randomUUID(),
  } as const;
}

async function generateMoviePostersData() {
  const imageNames = await readdir(join(import.meta.dirname, 'images'));
  const moviePosters = await Promise.all(
    imageNames.map(async (imageName) => {
      const absolutePath = join(import.meta.dirname, 'images', imageName);
      const { size } = await stat(absolutePath);

      return {
        absolutePath,
        mimeType: (await fileTypeFromFile(absolutePath))!.mime,
        sizeInBytes: size,
      } as const;
    }),
  );

  return moviePosters;
}

async function compareFiles(dest: Uint8Array, src: PathLike) {
  const expectedFile = await readFile(src);

  assert.strictEqual(expectedFile.compare(dest) === 0, true);
}

async function seedRole(database: ServerParams['database']) {
  const [createdRole] = await seedRoles(database, 1);

  return createdRole!;
}

async function seedRoles(database: ServerParams['database'], amount: number) {
  const handler = database.getHandler();
  const { role: roleModel } = database.getModels();

  const rolesToCreate = generateRolesData(amount);

  const createdRoles = await handler
    .insert(roleModel)
    .values(rolesToCreate)
    .returning({ id: roleModel.id, name: roleModel.name });

  return createdRoles;
}

function generateRolesData(amount = 1) {
  const roles = [...Array<CreateRole>(amount)].map(() => {
    return {
      name: randomAlphaNumericString(ROLE.NAME.MAX_LENGTH.VALUE - 1),
    } as const satisfies CreateRole;
  });

  return roles;
}

async function seedShowtime(database: ServerParams['database']) {
  const {
    createdShowtimes,
    createdMovies,
    createdMoviePosters,
    createdHalls,
    createdGenres,
  } = await seedShowtimes(database, 1);

  return {
    createdShowtime: createdShowtimes[0]!,
    createdMovie: createdMovies[0]!,
    createdMoviePosters: createdMoviePosters[0]!,
    createdHall: createdHalls[0]!,
    createdGenres: createdGenres[0]!,
  } as const;
}

async function seedShowtimes(
  database: ServerParams['database'],
  amount: number,
  ratio = amount / 6,
) {
  const handler = database.getHandler();
  const { showtime: showtimeModel } = database.getModels();

  const showtimesToCreate = generateShowtimesData(amount);
  const { createdMovies, createdMoviePosters, createdGenres } =
    await seedMovies(database, Math.ceil(amount / ratio));

  const createdHalls = await seedHalls(database, Math.ceil(amount / ratio));

  try {
    const createdShowtimes = await handler
      .insert(showtimeModel)
      .values(
        showtimesToCreate.map((showtimeToCreate) => {
          return {
            ...showtimeToCreate,
            movieId:
              createdMovies[randomNumber(0, createdMovies.length - 1)]!.id,
            hallId: createdHalls[randomNumber(0, createdHalls.length - 1)]!.id,
          } as const;
        }),
      )
      .returning({
        id: showtimeModel.id,
        at: showtimeModel.at,
        movieId: showtimeModel.movieId,
        hallId: showtimeModel.hallId,
      });

    return {
      createdShowtimes,
      createdMovies,
      createdMoviePosters,
      createdHalls,
      createdGenres,
    } as const;
  } catch (error) {
    await clearDatabase(database);

    throw error;
  }
}

function generateShowtimesData(amount = 1) {
  const showtimes = [...Array<CreateShowtime>(amount)].map(() => {
    return {
      at: new Date(
        randomNumber(
          SHOWTIME.AT.MIN_VALUE.VALUE() + 600_000, // Ten minutes in milliseconds
          SHOWTIME.AT.MIN_VALUE.VALUE() + 2_629_746_000, // One month in milliseconds
        ),
      ),
    } as const satisfies CreateShowtime;
  });

  return showtimes;
}

async function seedUser(
  authentication: ServerParams['authentication'],
  database: ServerParams['database'],
  withHashing = false,
) {
  const { createdUsers, createdRoles } = await seedUsers(
    authentication,
    database,
    1,
    withHashing,
  );

  return {
    createdUser: createdUsers[0]!,
    createdRole: createdRoles[0]!,
  } as const;
}

// We don't consider optional params
// eslint-disable-next-line @typescript-eslint/max-params
async function seedUsers(
  authentication: ServerParams['authentication'],
  database: ServerParams['database'],
  amount: number,
  withHashing = false,
  ratio = amount / 6,
) {
  const handler = database.getHandler();
  const { user: userModel } = database.getModels();

  const usersToCreate = generateUsersData(amount);

  const createdRoles = await seedRoles(database, Math.ceil(amount / ratio));

  try {
    const createdUsers = (
      await handler
        .insert(userModel)
        .values(
          await Promise.all(
            usersToCreate.map(async (userToCreate) => {
              const { password, ...fields } = userToCreate;

              let hash = password;
              if (withHashing) {
                hash = await authentication.hashPassword(hash);
              }

              return {
                ...fields,
                roleId:
                  createdRoles[randomNumber(0, createdRoles.length - 1)]!.id,
                hash,
              } as const;
            }),
          ),
        )
        .returning({
          id: userModel.id,
          firstName: userModel.firstName,
          lastName: userModel.lastName,
          email: userModel.email,
          roleId: userModel.roleId,
        })
    ).map((createdUser) => {
      const { roleId, ...fields } = createdUser;

      const roleName = createdRoles.find((role) => {
        return role.id === roleId;
      })!.name;

      return {
        ...fields,
        role: roleName,
      } as const;
    });

    return {
      createdUsers,
      createdRoles,
    } as const;
  } catch (error) {
    await clearDatabase(database);

    throw error;
  }
}

function generateUsersData(amount = 1) {
  const users = [...Array<Omit<CreateUser, 'roleId'>>(amount)].map(() => {
    return {
      firstName: randomAlphaNumericString(USER.FIRST_NAME.MIN_LENGTH.VALUE + 1),
      lastName: randomAlphaNumericString(USER.LAST_NAME.MIN_LENGTH.VALUE + 1),
      email: `${randomAlphaNumericString(randomNumber(USER.EMAIL.MIN_LENGTH.VALUE + 1, USER.EMAIL.MAX_LENGTH.VALUE / 2))}@ph.com`,
      password: randomAlphaNumericString(USER.PASSWORD.MIN_LENGTH.VALUE + 1),
    } as const satisfies Omit<CreateUser, 'roleId'>;
  });

  return users;
}

function generateRandomUserData(roleId?: string) {
  return {
    ...generateUsersData(1)[0]!,
    roleId: roleId ?? randomUUID(),
  } as const;
}

async function checkUserPassword(params: {
  authentication: ServerParams['authentication'];
  database: ServerParams['database'];
  credentials: { email: string; password: string };
}) {
  const { authentication, database, credentials } = params;

  const handler = database.getHandler();
  const { user: userModel } = database.getModels();
  const { email, password } = credentials;

  const users = await handler
    .select({ hash: userModel.hash })
    .from(userModel)
    .where(eq(userModel.email, email));
  if (!users.length) {
    assert.fail(`Are you sure you've sent the correct credentials?`);
  }

  const isValid = await authentication.verifyPassword(users[0]!.hash, password);
  assert.deepStrictEqual(isValid, true);
}

/**********************************************************************************/
/********************************** Mocks *****************************************/

function mockLogger() {
  const logger = new Logger();

  function emptyFunction() {
    // On purpose
  }

  (['debug', 'info', 'log', 'warn', 'error'] as const).forEach((level) => {
    mock.method(logger, level, emptyFunction);
  });
  mock.method(
    logger,
    'logMiddleware',
    (_request: Request, _response: Response, next: NextFunction) => {
      next();
    },
  );

  return logger;
}

function createHttpMocks(params: {
  logger: Logger;
  reqOptions?: RequestOptions;
  resOptions?: ResponseOptions;
}) {
  const { logger, reqOptions, resOptions } = params;

  return {
    request: createRequest({
      app: {
        locals: {
          logger,
        },
      },
      ...reqOptions,
    }),
    response: createResponse(resOptions),
  } as const;
}

/**********************************************************************************/

export {
  after,
  assert,
  AUTHENTICATION,
  before,
  Buffer,
  checkUserPassword,
  clearDatabase,
  compareFiles,
  CONSTANTS,
  createHttpMocks,
  createWebsocketClient,
  eq,
  ERROR_CODES,
  GeneralError,
  generateGenresData,
  generateHallsData,
  generateMovieDataIncludingPoster,
  generateMoviePostersData,
  generateMoviesData,
  generateRandomUserData,
  generateRolesData,
  generateShowtimesData,
  generateTokens,
  generateUsersData,
  GENRE,
  getAdminTokens,
  HALL,
  HTTP_STATUS_CODES,
  initServer,
  Middlewares,
  MOVIE,
  PostgresError,
  randomAlphaNumericString,
  randomNumber,
  randomUUID,
  readFile,
  ROLE,
  seedGenre,
  seedGenres,
  seedHall,
  seedHalls,
  seedMovie,
  seedMovies,
  seedRole,
  seedRoles,
  seedShowtime,
  seedShowtimes,
  seedUser,
  seedUsers,
  sendHttpRequest,
  SHOWTIME,
  suite,
  terminateServer,
  test,
  USER,
  VALIDATION,
  type Genre,
  type Hall,
  type Movie,
  type PaginatedResult,
  type Role,
  type ServerParams,
  type Showtime,
  type User,
};
