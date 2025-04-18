import { tmpdir } from 'node:os';
import { resolve } from 'node:path';

import { MESSAGE_QUEUE } from '@adamakiva/movie-reservation-system-shared';

import { HttpServer } from '../../server/index.ts';
import { EnvironmentManager } from '../../utils/config.ts';
import { Logger } from '../../utils/logger.ts';

/**********************************************************************************/

async function createServer() {
  // In order to reuse the environment manager class, we swap the relevant values
  process.env.DATABASE_URL = process.env.DATABASE_TEST_URL;

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
      keysPath: resolve(import.meta.dirname, '..', '..', '..', 'keys'),
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
      origin:
        serverEnv.allowedOrigins.length === 1
          ? serverEnv.allowedOrigins[0]
          : serverEnv.allowedOrigins,
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
    logger,
  } as const;
}

function emptyFunction() {
  // On purpose
}

function mockLogger() {
  const logger = new Logger();

  (['debug', 'info', 'log', 'warn', 'error'] as const).forEach((level) => {
    logger[level] = emptyFunction;
  });
  logger.getLogMiddleware = () => {
    return (_request, _response, next) => {
      next();
    };
  };

  return logger;
}

const handler = await createServer();

/**********************************************************************************/

export { handler };
