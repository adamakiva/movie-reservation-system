import assert from 'node:assert/strict';
import { randomUUID as nodeRandomUUID } from 'node:crypto';
import { EventEmitter } from 'node:events';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { after, before, suite, test } from 'node:test';

import { argon2i, hash } from 'argon2';
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

import { getTableName, sql } from 'drizzle-orm';
import type { Database } from '../src/database/index.ts';
import { VALIDATION } from '../src/entities/utils.validator.ts';
import { HttpServer } from '../src/server/index.ts';
import * as Middlewares from '../src/server/services/middlewares.ts';
import {
  EnvironmentManager,
  ERROR_CODES,
  GeneralError,
  HTTP_STATUS_CODES,
  Logger,
  MESSAGE_QUEUE,
  randomAlphaNumericString,
  type DatabaseHandler,
  type DatabaseModel,
  type LoggerHandler,
  type ResponseWithContext,
  type ResponseWithoutContext,
} from '../src/utils/index.ts';

/**********************************************************************************/

// To make sure the tests don't miss anything, not even warnings
process.on('warning', (warn) => {
  console.error(warn);

  process.exit(1);
});

// In order to reuse the environment manager class, we swap the only different
// value
process.env.DATABASE_URL = process.env.DATABASE_TEST_URL;

const CONSTANTS = {
  ONE_MEGABYTE_IN_BYTES: 1_000_000,
  EIGHT_MEGABYTES_IN_BYTES: 8_000_000,
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
} as const;

const { PostgresError } = pg;

/**********************************************************************************/

type ServerParams = Awaited<ReturnType<typeof initServer>>;

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
  const { logger, logMiddleware } = mockLogger();

  const environmentManager = new EnvironmentManager(logger);
  const {
    node,
    jwt,
    server: serverEnv,
    database,
    messageQueue,
  } = environmentManager.getEnvVariables();

  // See: https://nodejs.org/api/events.html#capture-rejections-of-promises
  EventEmitter.captureRejections = true;

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
      generatedNameLength: 32,
      saveDir: tmpdir(),
      watermark: node.defaultHighWaterMark,
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
          application_name: 'movie_reservation_system_pg',
          statement_timeout: database.statementTimeout,
          idle_in_transaction_session_timeout: database.transactionTimeout,
        },
      },
      healthCheckQuery: 'SELECT NOW()',
    },
    messageQueueParams: {
      connectionOptions: { url: messageQueue.url },
      publishers: {
        ticket: {
          confirm: true,
          maxAttempts: 32,
          routing: [
            {
              exchange: MESSAGE_QUEUE.TICKET.RESERVE.EXCHANGE_NAME,
              queue: MESSAGE_QUEUE.TICKET.RESERVE.QUEUE_NAME,
              routingKey: MESSAGE_QUEUE.TICKET.RESERVE.ROUTING_KEY_NAME,
            },
          ],
        },
      },
    },
    allowedMethods: serverEnv.allowedMethods,
    routes: {
      http: `/${serverEnv.httpRoute}`,
    },
    logMiddleware,
    logger,
  });

  const port = await server.listen();
  const baseUrl = `http://127.0.0.1:${port}`;

  return {
    server,
    authentication: server.getAuthenticationManager(),
    fileManager: server.getFileManager(),
    database: server.getDatabase(),
    environmentManager,
    routes: {
      base: baseUrl,
      http: `${baseUrl}/${serverEnv.httpRoute}`,
    },
  } as const;
}

function getRequestContext(serverParams: ServerParams, logger: LoggerHandler) {
  return {
    authentication: serverParams.authentication,
    database: serverParams.database,
    logger: logger,
  } as const;
}

function getAdminRole() {
  return {
    id: process.env.ADMIN_ROLE_ID!,
    name: process.env.ADMIN_ROLE_NAME!,
  } as const;
}

async function clearDatabase(serverParams: ServerParams) {
  const { database } = serverParams;
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
  const uuids = [...Array(amount)].map(() => {
    return nodeRandomUUID();
  });

  return (amount === 1 ? uuids[0] : uuids) as T extends 1 ? string : string[];
}

function shuffleArray<T>(array: T[]) {
  for (let i = array.length - 1; i > 0; i--) {
    // Generate a random index between 0 and i (inclusive)
    const randomIndex = Math.floor(Math.random() * (i + 1));

    // Swap elements at i and randomIndex
    const tmp = array[i];
    array[i] = array[randomIndex]!;
    array[randomIndex] = tmp!;
  }

  return array;
}

/******************************* API calls ****************************************/
/**********************************************************************************/

function sendHttpRequest<
  T extends 'HEAD' | 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
>(params: {
  route: string;
  method: T;
  payload?: T extends 'HEAD' | 'GET' | 'DELETE' ? never : unknown;
  headers?: HeadersInit;
}) {
  const { route, method, payload, headers } = params;

  let fetchOptions: RequestInit = {
    method,
    cache: 'no-store',
    mode: 'same-origin',
    body: JSON.stringify(payload),
    headers: {
      ...headers,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    redirect: 'follow',
  };
  if (payload instanceof FormData) {
    fetchOptions = {
      ...fetchOptions,
      body: payload,
      headers: { ...headers },
    };
  }

  return fetch(route, fetchOptions);
}

async function generateTokens(params: {
  serverParams: ServerParams;
  email: string;
  password: string;
}) {
  const { serverParams, email, password } = params;

  const res = await sendHttpRequest({
    route: `${serverParams.routes.http}/login`,
    method: 'POST',
    payload: { email, password },
  });
  assert.strictEqual(res.status, HTTP_STATUS_CODES.CREATED);

  return await res.json();
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
  const loggerHandler = logger.getHandler();

  return {
    logger: {
      ...loggerHandler,
      debug: emptyFunction,
      info: emptyFunction,
      log: emptyFunction,
      warn: emptyFunction,
      error: emptyFunction,
    },
    logMiddleware: (_req: Request, _res: Response, next: NextFunction) => {
      // Disable logging middleware
      next();
    },
  } as const;
}

function createHttpMocks<T extends Response = Response>(params: {
  logger: LoggerHandler;
  reqOptions?: RequestOptions;
  resOptions?: ResponseOptions;
}) {
  const { logger, reqOptions, resOptions } = params;

  return {
    request: createRequest(reqOptions),
    response: createResponse<T>({
      ...resOptions,
      locals: {
        context: { logger: logger },
      },
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
  getRequestContext,
  HTTP_STATUS_CODES,
  initServer,
  Middlewares,
  mockLogger,
  PostgresError,
  randomAlphaNumericString,
  randomNumber,
  randomUUID,
  sendHttpRequest,
  shuffleArray,
  suite,
  terminateServer,
  test,
  VALIDATION,
  type Database,
  type Logger,
  type LoggerHandler,
  type MockRequest,
  type MockResponse,
  type NextFunction,
  type Request,
  type ResponseWithContext,
  type ResponseWithoutContext,
  type ServerParams,
};
