/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-return */

import assert from 'node:assert/strict';
import { randomUUID as nodeRandomUUID } from 'node:crypto';
import { EventEmitter } from 'node:events';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { after, before, mock, suite, test } from 'node:test';

import {
  ERROR_CODES,
  HTTP_STATUS_CODES,
  MESSAGE_QUEUE,
} from '@adamakiva/movie-reservation-system-shared';
import { argon2i, hash } from 'argon2';
import { getTableName, sql } from 'drizzle-orm';
import type { NextFunction, Request, Response } from 'express';
import {
  createRequest,
  createResponse,
  type MockRequest,
  type MockResponse,
  type RequestOptions,
  type ResponseOptions,
} from 'node-mocks-http';
import pg from 'postgres';

import type { Database } from '../src/database/index.ts';
import { VALIDATION } from '../src/entities/utils.validator.ts';
import { HttpServer } from '../src/server/index.ts';
import * as Middlewares from '../src/server/services/middlewares.ts';
import {
  EnvironmentManager,
  GeneralError,
  Logger,
  type DatabaseHandler,
  type DatabaseModel,
  type PaginatedResult,
  type ResponseWithContext,
  type ResponseWithoutContext,
} from '../src/utils/index.ts';

/**********************************************************************************/

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

/***************************** Server setup ***************************************/
/**********************************************************************************/

async function initServer() {
  return await createServer();
}

function terminateServer(serverParams: ServerParams) {
  // The database closure is handled by the server close event handler
  serverParams.server.close();
}

/**********************************************************************************/

async function createServer() {
  // In order to reuse the environment manager class, we swap the relevant values
  process.env.DATABASE_URL = process.env.DATABASE_TEST_URL;

  // See: https://nodejs.org/api/events.html#capture-rejections-of-promises
  EventEmitter.captureRejections = true;

  const logger = mockLogger();

  const environmentManager = new EnvironmentManager(logger);
  const {
    node,
    jwt,
    server: serverEnv,
    database,
    messageQueue,
  } = environmentManager.getEnvVariables();

  const server = await HttpServer.create({
    authenticationParams: {
      audience: 'mrs-users',
      issuer: 'mrs-server',
      type: 'JWT',
      algorithm: 'RS256',
      access: {
        expiresAt: jwt.accessTokenExpiration,
      },
      refresh: {
        expiresAt: jwt.refreshTokenExpiration,
      },
      keysPath: resolve(import.meta.dirname, '..', 'keys'),
      hashSecret: jwt.hash,
    },
    fileManagerParams: {
      generatedFileNameLength: 32,
      saveDir: tmpdir(),
      highWatermark: node.defaultHighWaterMark,
      limits: {
        fileSize: 4_194_304, // 4mb
        files: 1, // Currently only 1 file is expected, change if needed
      },
    },
    corsOptions: {
      methods: Array.from(serverEnv.allowedMethods),
      origin:
        serverEnv.allowedOrigins.size === 1
          ? Array.from(serverEnv.allowedOrigins)[0]
          : Array.from(serverEnv.allowedOrigins),
      maxAge: 86_400, // 1 day in seconds
      optionsSuccessStatus: 200, // last option here: https://github.com/expressjs/cors?tab=readme-ov-file#configuration-options
    },
    databaseParams: {
      url: database.url,
      options: {
        max: database.maxConnections,
        connection: {
          statement_timeout: database.statementTimeout,
          idle_in_transaction_session_timeout: database.transactionTimeout,
        },
      },
      // Alive vs Readiness check boils down to:
      // Should we restart the pod OR redirect the traffic to a different pod
      isAliveQuery: 'SELECT NOW()',
      isReadyQuery: 'SELECT NOW()',
    },
    messageQueueParams: {
      connectionOptions: { url: messageQueue.url },
      routing: MESSAGE_QUEUE,
    },
    allowedMethods: serverEnv.allowedMethods,
    routes: {
      http: `/${serverEnv.httpRoute}`,
    },
    logMiddleware: logger.getLogMiddleware(),
    logger,
  });

  const port = await server.listen();
  const baseUrl = `http://127.0.0.1:${port}`;

  return {
    server,
    authentication: server.getAuthenticationManager(),
    fileManager: server.getFileManager(),
    database: server.getDatabase(),
    messageQueue: server.getMessageQueue(),
    routes: {
      base: baseUrl,
      http: `${baseUrl}/${serverEnv.httpRoute}`,
    },
  } as const;
}

function getAdminRole() {
  return {
    id: process.env.ADMIN_ROLE_ID!,
    name: process.env.ADMIN_ROLE_NAME!,
  } as const;
}

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

function randomNumber(min = 0, max = 9) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
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
  payload?: M extends 'HEAD' | 'GET' | 'DELETE' ? never : unknown;
  headers?: HeadersInit;
  responseType: RT;
}): Promise<ResponseType<RT, R>> {
  const { route, method, payload, responseType } = params;

  const headers = !(payload instanceof FormData)
    ? { ...params.headers, 'Content-Type': 'application/json' }
    : { ...params.headers };

  const fetchOptions: RequestInit = {
    method,
    cache: 'no-store',
    mode: 'same-origin',
    body: payload instanceof FormData ? payload : JSON.stringify(payload),
    headers,
    redirect: 'manual',
    window: null,
  };

  const fetchResponse = await fetch(route, fetchOptions);
  const statusCode = fetchResponse.status;

  if (!fetchResponse.ok) {
    return {
      statusCode,
      responseBody: fetchResponse.body,
    } as ResponseType<RT, R>;
  }

  switch (responseType) {
    case 'bytes':
      return {
        statusCode,
        responseBody: await fetchResponse[responseType as 'bytes'](),
      } as ResponseType<RT, R>;
    case 'json':
    case 'text':
      return {
        statusCode: fetchResponse.status,
        responseBody:
          await fetchResponse[
            // False-positive, we deduct an option from the generic param
            // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
            responseType as 'json' | 'text'
          ](),
      } as ResponseType<RT, R>;
    default:
      throw new Error('Should never happen');
  }
}

async function generateTokens(params: {
  serverParams: ServerParams;
  email: string;
  password: string;
}) {
  const { serverParams, email, password } = params;

  const { statusCode, responseBody } = await sendHttpRequest<'POST', 'json'>({
    route: `${serverParams.routes.http}/login`,
    method: 'POST',
    payload: { email, password },
    responseType: 'json',
  });
  assert.strictEqual(statusCode, HTTP_STATUS_CODES.CREATED);

  return await responseBody;
}

async function getAdminTokens(serverParams: ServerParams) {
  const email = process.env.ADMIN_EMAIL!;
  const password = process.env.ADMIN_PASSWORD!;

  return await generateTokens({ serverParams, email, password });
}

/**********************************************************************************/
/********************************** Mocks *****************************************/

function emptyFunction() {
  // On purpose
}

function mockLogger() {
  const logger = new Logger();

  (['debug', 'info', 'log', 'warn', 'error'] as const).forEach((level) => {
    mock.method(logger, level, emptyFunction);
  });

  return logger;
}

function createHttpMocks<T extends Response = Response>(params: {
  logger: Logger;
  reqOptions?: RequestOptions;
  resOptions?: ResponseOptions;
}) {
  const { logger, reqOptions, resOptions } = params;

  return {
    request: createRequest(reqOptions),
    response: createResponse<T>({
      locals: {
        context: { logger: logger },
      },
      ...resOptions,
    }),
  } as const;
}

/**********************************************************************************/

export {
  after,
  assert,
  before,
  clearDatabase,
  CONSTANTS,
  createHttpMocks,
  ERROR_CODES,
  GeneralError,
  generateTokens,
  getAdminRole,
  getAdminTokens,
  HTTP_STATUS_CODES,
  initServer,
  Middlewares,
  mockLogger,
  PostgresError,
  randomAlphaNumericString,
  randomNumber,
  randomUUID,
  sendHttpRequest,
  suite,
  terminateServer,
  test,
  VALIDATION,
  type Database,
  type Logger,
  type MockRequest,
  type MockResponse,
  type NextFunction,
  type PaginatedResult,
  type Request,
  type ResponseWithContext,
  type ResponseWithoutContext,
  type ServerParams,
};
