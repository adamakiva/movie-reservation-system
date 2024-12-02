/**
 * Since every test file import first (hoisted anyhow on ESM) and ONLY from
 * this file, we can put this here and be sure it runs before any other import
 * (except vitest internals, but we can't really change those, can we?)
 */
import { EventEmitter } from 'node:events';

// See: https://nodejs.org/api/events.html#capture-rejections-of-promises
EventEmitter.captureRejections = true;

// To make sure the tests don't miss anything, not even warnings
process.on('warning', (warn) => {
  console.error(warn);

  process.exit(1);
});

/**********************************************************************************/

import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { resolve } from 'node:path';
import { after, before, suite, test } from 'node:test';

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

import * as controllers from '../src/controllers/index.js';
import type { Database } from '../src/db/index.js';
import { HttpServer } from '../src/server/index.js';
import * as Middlewares from '../src/server/middlewares.js';
import * as services from '../src/services/index.js';
import {
  CONFIGURATIONS,
  eq,
  ERROR_CODES,
  HTTP_STATUS_CODES,
  isTestMode,
  Logger,
  MRSError,
  type LoggerHandler,
  type Mode,
  type ResponseWithCtx,
  type ResponseWithoutCtx,
} from '../src/utils/index.js';
import * as validators from '../src/validators/index.js';
import { VALIDATION } from '../src/validators/index.js';

const { PostgresError } = pg;

/**********************************************************************************/

type EnvironmentVariables = {
  mode: Mode;
  server: {
    baseUrl: string;
    httpRoute: string;
    healthCheckRoute: string;
  };
  databaseUrl: string;
  hashSecret: Buffer;
};

type ServerParams = Awaited<ReturnType<typeof initServer>>;

/***************************** Server setup ***************************************/
/**********************************************************************************/

async function initServer() {
  return await createServer();
}

function terminateServer(params: ServerParams) {
  const { server } = params;

  // The database closure is handled by the server close event handler
  server.close();
}

/**********************************************************************************/

async function createServer() {
  const { mode, server: serverEnv, databaseUrl, hashSecret } = getTestEnv();

  const { logger, logMiddleware } = mockLogger();

  const server = await HttpServer.create({
    mode: mode,
    authenticationParams: {
      audience: 'mrs-users',
      issuer: 'mrs-server',
      alg: 'RS256',
      access: {
        expiresAt: 300_000, // 5 minutes
      },
      refresh: {
        expiresAt: 600_000, // 10 minutes
      },
      keysPath: resolve(import.meta.dirname, '..', 'keys'),
      hashSecret,
    },
    databaseParams: {
      url: databaseUrl,
      options: {
        connection: {
          application_name: 'movie_reservation_system_pg_test',
          statement_timeout: CONFIGURATIONS.POSTGRES.STATEMENT_TIMEOUT,
          idle_in_transaction_session_timeout:
            CONFIGURATIONS.POSTGRES.IDLE_IN_TRANSACTION_SESSION_TIMEOUT,
        },
      },
      healthCheckQuery: 'SELECT NOW()',
    },
    allowedMethods: new Set([
      'HEAD',
      'GET',
      'POST',
      'PUT',
      'PATCH',
      'DELETE',
      'OPTIONS',
    ]),
    routes: {
      http: `/${serverEnv.httpRoute}`,
      health: `/${serverEnv.healthCheckRoute}`,
    },
    logger: logger,
    logMiddleware: logMiddleware,
  });

  const port = await server.listen();
  const baseUrl = `http://127.0.0.1:${port}`;
  const {
    server: { httpRoute, healthCheckRoute },
  } = getTestEnv();

  return {
    server: server,
    authentication: server.getAuthentication(),
    database: server.getDatabase(),
    routes: {
      base: `${baseUrl}/${httpRoute}`,
      health: `${baseUrl}/${healthCheckRoute}`,
    },
  };
}

function getTestEnv(): EnvironmentVariables {
  const mode = checkRuntimeEnv(process.env.NODE_ENV);
  checkEnvVariables();

  return {
    mode: mode,
    server: {
      baseUrl: process.env.SERVER_BASE_URL!,
      httpRoute: process.env.HTTP_ROUTE!,
      healthCheckRoute: process.env.HEALTH_CHECK_ROUTE!,
    },
    databaseUrl: process.env.DB_TEST_URL!,
    hashSecret: Buffer.from(process.env.HASH_SECRET!),
  } as const;
}

function checkRuntimeEnv(mode?: string) {
  if (isTestMode(mode)) {
    return mode as 'test';
  }

  console.error(
    `Missing or invalid 'NODE_ENV' env value, should never happen.` +
      ' Unresolvable, exiting...',
  );

  return process.exit(ERROR_CODES.EXIT_NO_RESTART);
}

function checkEnvVariables() {
  let missingValues = '';
  [
    'SERVER_BASE_URL',
    'HTTP_ROUTE',
    'HEALTH_CHECK_ROUTE',
    'DB_TEST_URL',
    'HASH_SECRET',
  ].forEach((val) => {
    if (!process.env[val]) {
      missingValues += `* Missing ${val} environment variable\n`;
    }
  });
  if (missingValues) {
    console.error(
      `\nMissing the following environment vars:\n${missingValues}`,
    );

    process.exit(ERROR_CODES.EXIT_NO_RESTART);
  }
}

/***************************** General utils **************************************/
/**********************************************************************************/

function randomString(len = 32) {
  const alphabeticCharacters =
    'ABCDEABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
  const alphabeticCharactersLen = alphabeticCharacters.length;

  let str = '';
  for (let i = 0; i < len; ++i) {
    str += alphabeticCharacters.charAt(
      Math.floor(Math.random() * alphabeticCharactersLen),
    );
  }

  return str;
}

function randomNumber(min = 0, max = 9) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomUUID(amount = 1) {
  if (amount === 1) {
    return crypto.randomUUID();
  }

  return [...Array<string>(amount)].map(() => {
    return crypto.randomUUID();
  });
}

/**********************************************************************************/
/********************************** Seeds *****************************************/

async function seedUser(
  serverParams: ServerParams,
  // eslint-disable-next-line no-unused-vars
  fn: (email: string, password: string) => Promise<unknown>,
) {
  const { authentication, database } = serverParams;
  const handler = database.getHandler();
  const { user: userModel, role: roleModel } = database.getModels();

  const roleName = randomString();
  const password = randomString();
  const userData = {
    email: `${randomString(8)}@ph.com`,
    firstName: randomString(6),
    lastName: randomString(8),
    hash: await authentication.hashPassword(password),
  };

  const { roleId } = (
    await handler
      .insert(roleModel)
      .values({ name: roleName })
      .returning({ roleId: roleModel.id })
  )[0]!;
  await handler.insert(userModel).values({ ...userData, roleId });

  try {
    await fn(userData.email, password);
  } finally {
    await handler.delete(userModel).where(eq(userModel.email, userData.email));
    await handler.delete(roleModel).where(eq(roleModel.id, roleId));
  }
}

/******************************* API calls ****************************************/
/**********************************************************************************/

function sendHttpRequest(params: {
  route: string;
  method: string;
  payload?: unknown;
  headers?: HeadersInit;
}) {
  const { route, method, payload, headers } = params;

  const requestOptions: RequestInit = {
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
  } as const;

  return fetch(route, requestOptions);
}

/**********************************************************************************/
/********************************** Mocks *****************************************/

function mockLogger() {
  const logger = new Logger();
  const loggerHandler = logger.getHandler();

  function disableLog() {
    // Disable logs
  }

  return {
    logger: {
      ...loggerHandler,
      debug: disableLog,
      info: disableLog,
      log: disableLog,
      warn: disableLog,
      error: disableLog,
    },
    logMiddleware: (_req: Request, _res: Response, next: NextFunction) => {
      // Disable logging middleware
      next();
    },
  };
}

function createHttpMocks<T extends Response = Response>(params: {
  logger: ReturnType<Logger['getHandler']>;
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
  };
}

/**********************************************************************************/

export {
  after,
  assert,
  before,
  controllers,
  createHttpMocks,
  ERROR_CODES,
  HTTP_STATUS_CODES,
  initServer,
  Middlewares,
  mockLogger,
  MRSError,
  PostgresError,
  randomNumber,
  randomString,
  randomUUID,
  seedUser,
  sendHttpRequest,
  services,
  suite,
  terminateServer,
  test,
  VALIDATION,
  validators,
  type Database,
  type Logger,
  type LoggerHandler,
  type MockRequest,
  type MockResponse,
  type NextFunction,
  type Request,
  type ResponseWithCtx,
  type ResponseWithoutCtx,
  type ServerParams,
};
