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
import {
  CONFIGURATIONS,
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

const { PostgresError } = pg;

/**********************************************************************************/

type EnvironmentVariables = {
  mode: Mode;
  server: {
    baseUrl: string;
    httpRoute: string;
    healthCheckRoute: string;
  };
  db: string;
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
  const { mode, server: serverEnv, db: dbUrl } = getTestEnv();

  const { logger, logMiddleware } = mockLogger();

  const server = await HttpServer.create({
    mode: mode,
    authenticationParams: {},
    databaseParams: {
      url: dbUrl,
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
    server: { healthCheckRoute },
  } = getTestEnv();

  return {
    server: server,
    db: server.getDatabase(),
    routes: {
      base: baseUrl,
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
    db: process.env.DB_TEST_URL!,
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

/******************************* API calls ****************************************/
/**********************************************************************************/

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
  suite,
  terminateServer,
  test,
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
