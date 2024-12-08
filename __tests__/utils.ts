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

import { inArray } from 'drizzle-orm';
import * as controllers from '../src/controllers/index.js';
import type { Database } from '../src/database/index.js';
import { HttpServer } from '../src/server/index.js';
import * as Middlewares from '../src/server/middlewares.js';
import * as services from '../src/services/index.js';
import type { Role } from '../src/services/role/utils.js';
import type { User } from '../src/services/user/utils.js';
import {
  CONFIGURATIONS,
  EnvironmentManager,
  eq,
  ERROR_CODES,
  HTTP_STATUS_CODES,
  Logger,
  MRSError,
  type Credentials,
  type LoggerHandler,
  type ResponseWithCtx,
  type ResponseWithoutCtx,
} from '../src/utils/index.js';
import * as validators from '../src/validators/index.js';
import { VALIDATION } from '../src/validators/utils.js';

const { PostgresError } = pg;

// In order to reuse the environment manager class, we swap the only different
// value
process.env.DATABASE_URL = process.env.DATABASE_TEST_URL;

/**********************************************************************************/

type CreateRole = { name: string };
type CreateUser = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  roleId: string;
};

type ServerParams = Awaited<ReturnType<typeof initServer>>;

/***************************** Server setup ***************************************/
/**********************************************************************************/

async function initServer() {
  const server = await createServer();

  return server;
}

function terminateServer(params: ServerParams) {
  const { server } = params;

  // The database closure is handled by the server close event handler
  server.close();
}

/**********************************************************************************/

async function createServer() {
  const { logger, logMiddleware } = mockLogger();

  const environmentManager = new EnvironmentManager(
    logger,
    process.env.NODE_ENV,
  );
  const {
    mode,
    server: serverEnvironment,
    databaseUrl,
    hashSecret,
  } = environmentManager.getEnvVariables();

  const server = await HttpServer.create({
    mode: mode,
    authenticationParams: {
      audience: 'mrs-users',
      issuer: 'mrs-server',
      alg: 'RS256',
      access: {
        expiresAt: 60_000, // 1 minute
      },
      refresh: {
        expiresAt: 120_000, // 2 minutes
      },
      keysPath: resolve(import.meta.dirname, '..', 'keys'),
      hashSecret,
    },
    corsOptions: {
      methods: Array.from(serverEnvironment.allowedMethods),
      origin:
        serverEnvironment.allowedOrigins.size === 1
          ? Array.from(serverEnvironment.allowedOrigins)[0]
          : Array.from(serverEnvironment.allowedOrigins),
      maxAge: 60, // 1 minute in seconds
      optionsSuccessStatus: 200, // last option here: https://github.com/expressjs/cors?tab=readme-ov-file#configuration-options
    },
    databaseParams: {
      url: databaseUrl,
      options: {
        max: 1, // On purpose to check issues with only a single database connection
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
      http: `/${serverEnvironment.httpRoute}`,
      health: `/${serverEnvironment.healthCheckRoute}`,
    },
    logger: logger,
    logMiddleware: logMiddleware,
  });

  const port = await server.listen();
  const baseUrl = `http://127.0.0.1:${port}`;

  return {
    server: server,
    authentication: server.getAuthentication(),
    database: server.getDatabase(),
    environmentManager,
    routes: {
      base: `${baseUrl}/${serverEnvironment.httpRoute}`,
      health: `${baseUrl}/${serverEnvironment.healthCheckRoute}`,
    },
  } as const;
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

async function checkUserPassword(
  serverParams: ServerParams,
  credentials: Credentials,
) {
  const { authentication, database } = serverParams;
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

  return fetch(route, {
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
  });
}

async function generateTokens(params: {
  serverParams: ServerParams;
  email: string;
  password: string;
}) {
  const { serverParams, email, password } = params;

  const res = await sendHttpRequest({
    route: `${serverParams.routes.base}/login`,
    method: 'POST',
    payload: { email, password },
  });

  assert.strictEqual(res.status, HTTP_STATUS_CODES.CREATED);

  const jsonResponse = await res.json();

  return jsonResponse;
}

async function getAdminTokens(serverParams: ServerParams) {
  const email = process.env.ADMIN_EMAIL!;
  const password = process.env.ADMIN_PASSWORD!;

  const tokens = (await generateTokens({ serverParams, email, password })) as {
    accessToken: string;
    refreshToken: string;
  };

  return tokens;
}

function getAdminRole() {
  return {
    id: process.env.ADMIN_ROLE_ID!,
    name: process.env.ADMIN_ROLE_NAME!,
  } as const;
}

function getAdminUserId() {
  return process.env.ADMIN_ID!;
}

async function createRoles<T extends number = 1>(
  serverParams: ServerParams,
  data: T | (T extends 1 ? CreateRole : CreateRole[]),
  fn: (
    // eslint-disable-next-line no-unused-vars
    tokens: { accessToken: string; refreshToken: string },
    // eslint-disable-next-line no-unused-vars
    role: T extends 1 ? Role : Role[],
  ) => Promise<unknown>,
) {
  let roleIds: string[] = [];
  let rolesData: CreateRole[] = null!;
  if (typeof data === 'number') {
    rolesData = [...Array(data)].map(() => {
      return {
        name: randomString(16),
      } as const as CreateRole;
    });
  } else if (!Array.isArray(data)) {
    rolesData = [data];
  } else {
    rolesData = data;
  }

  const adminTokens = await getAdminTokens(serverParams);
  try {
    const roles = await Promise.all(
      rolesData.map(async (roleData) => {
        const res = await sendHttpRequest({
          route: `${serverParams.routes.base}/roles`,
          method: 'POST',
          headers: { Authorization: adminTokens.accessToken },
          payload: roleData,
        });

        assert.strictEqual(res.status, HTTP_STATUS_CODES.CREATED);
        const role = (await res.json()) as Role;

        return role;
      }),
    );
    roleIds = roles.map((role) => {
      return role.id;
    });

    // @ts-expect-error On purpose
    const res = await fn(adminTokens, roles.length === 1 ? roles[0]! : roles);

    return res;
  } finally {
    await deleteRoles(serverParams, ...roleIds);
  }
}

async function deleteRoles(serverParams: ServerParams, ...roleIds: string[]) {
  roleIds = roleIds.filter((roleId) => {
    return roleId;
  });
  if (!roleIds.length) {
    return;
  }

  const databaseHandler = serverParams.database.getHandler();
  const { role: roleModel } = serverParams.database.getModels();

  await databaseHandler.delete(roleModel).where(inArray(roleModel.id, roleIds));
}

async function createUsers<T extends number = 1>(
  serverParams: ServerParams,
  data: T | (T extends 1 ? CreateUser : CreateUser[]),
  fn: (
    // eslint-disable-next-line no-unused-vars
    tokens: { accessToken: string; refreshToken: string },
    // eslint-disable-next-line no-unused-vars
    user: T extends 1 ? User : User[],
  ) => Promise<unknown>,
) {
  let userIds: string[] = [];
  let usersData: CreateUser[] = null!;
  if (typeof data === 'number') {
    const { id: roleId } = getAdminRole();
    usersData = generateRandomUsersData([roleId], data);
  } else if (!Array.isArray(data)) {
    usersData = [data];
  } else {
    usersData = data;
  }

  const adminTokens = await getAdminTokens(serverParams);
  try {
    const users = await Promise.all(
      usersData.map(async (userData) => {
        const res = await sendHttpRequest({
          route: `${serverParams.routes.base}/users`,
          method: 'POST',
          headers: { Authorization: adminTokens.accessToken },
          payload: userData,
        });

        assert.strictEqual(res.status, HTTP_STATUS_CODES.CREATED);
        const user = (await res.json()) as User;

        return user;
      }),
    );
    userIds = users.map((user) => {
      return user.id;
    });

    // @ts-expect-error On purpose
    const res = await fn(adminTokens, users.length === 1 ? users[0]! : users);

    return res;
  } finally {
    await deleteUsers(serverParams, ...userIds);
  }
}

function generateRandomUsersData(roleIds: string[], amount = 1) {
  return [...Array(amount)].map(() => {
    return {
      firstName: randomString(16),
      lastName: randomString(16),
      email: `${randomString(8)}@ph.com`,
      password: randomString(16),
      roleId: roleIds[randomNumber(0, roleIds.length - 1)],
    } as const as CreateUser;
  });
}

async function deleteUsers(serverParams: ServerParams, ...userIds: string[]) {
  userIds = userIds.filter((userId) => {
    return userId;
  });
  if (!userIds.length) {
    return;
  }

  const databaseHandler = serverParams.database.getHandler();
  const { user: userModel } = serverParams.database.getModels();

  await databaseHandler.delete(userModel).where(inArray(userModel.id, userIds));
}

/**********************************************************************************/
/********************************** Mocks *****************************************/

function mockLogger() {
  const logger = new Logger();
  const loggerHandler = logger.getHandler();

  return {
    logger: {
      ...loggerHandler,
      debug: disableLogFn,
      info: disableLogFn,
      log: disableLogFn,
      warn: disableLogFn,
      error: disableLogFn,
    },
    logMiddleware: (_req: Request, _res: Response, next: NextFunction) => {
      // Disable logging middleware
      next();
    },
  } as const;
}

function disableLogFn() {
  // Disable logs
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
  } as const;
}

/**********************************************************************************/

export {
  after,
  assert,
  before,
  checkUserPassword,
  controllers,
  createHttpMocks,
  createRoles,
  createUsers,
  deleteRoles,
  deleteUsers,
  ERROR_CODES,
  generateRandomUsersData,
  generateTokens,
  getAdminRole,
  getAdminTokens,
  getAdminUserId,
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
  type CreateUser,
  type Database,
  type Logger,
  type LoggerHandler,
  type MockRequest,
  type MockResponse,
  type NextFunction,
  type Request,
  type ResponseWithCtx,
  type ResponseWithoutCtx,
  type Role,
  type ServerParams,
  type User,
};
