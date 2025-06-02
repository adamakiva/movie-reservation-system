import { join } from 'node:path';

import {
  ERROR_CODES,
  SIGNALS,
} from '@adamakiva/movie-reservation-system-shared';

import { HttpServer } from './server/index.ts';
import { EnvironmentManager } from './utils/config.ts';
import { Logger } from './utils/logger.ts';

/**********************************************************************************/

async function startServer() {
  const logger = new Logger();

  const {
    node: nodeEnv,
    jwt: jwtEnv,
    httpServer: httpServerEnv,
    websocketServer: websocketServerEnv,
    database: databaseEnv,
    messageQueue: messageQueueEnv,
    adminRoleId,
  } = new EnvironmentManager(logger).getEnvVariables();

  const httpServer = await HttpServer.create({
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
      keysPath: join(import.meta.dirname, '..', 'keys'),
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
      // Alive vs Readiness check boils down to the following:
      // Should we restart the pod (isAlive) OR redirect the traffic to a different instance (isReady)
      isAliveQuery: 'SELECT NOW()',
      isReadyQuery: 'SELECT NOW()',
    },
    fileManagerParams: {
      generatedFileNameLength: 32,
      saveDir: join(import.meta.dirname, '..', 'posters'),
      highWatermark: nodeEnv.defaultHighWaterMark,
      pipeTimeout: nodeEnv.pipeTimeout,
      limits: {
        fileSize: 4_194_304, // 4mb
        files: 1, // Currently only 1 file is expected, change if needed
      },
    },
    cronjobParams: {
      moviePosterCleanupParams: {
        directory: join(import.meta.dirname, '..', 'posters'),
        retryInterval: 2_000,
        retryLimit: 3,
      },
    },
    messageQueueParams: messageQueueEnv,
    websocketServerParams: {
      path: websocketServerEnv.route,
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

  await httpServer.listen(httpServerEnv.port);

  attachProcessHandlers(httpServer, logger);
}

/**********************************************************************************/

function attachProcessHandlers(httpServer: HttpServer, logger: Logger) {
  async function errorHandler(error: unknown) {
    await closeServer({
      httpServer,
      code: ERROR_CODES.EXIT_RESTART,
      error: { logger, value: error },
    });
  }
  async function signalHandler() {
    await closeServer({ httpServer, code: ERROR_CODES.EXIT_NO_RESTART });
  }

  process
    .on('warning', logger.warn)
    .once('unhandledRejection', errorHandler)
    .once('uncaughtException', errorHandler);

  SIGNALS.forEach((signal) => {
    process.once(signal, signalHandler);
  });
}

async function closeServer(params: {
  httpServer: HttpServer;
  code: number;
  error?: {
    logger: Logger;
    value: unknown;
  };
}) {
  const { httpServer, code, error } = params;

  if (error) {
    const { logger, value } = error;
    logger.error(`Unhandled exception/rejection:`, value);
  }

  try {
    await httpServer.close();
  } finally {
    process.exit(code);
  }
}

/**********************************************************************************/

await startServer();
