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

  const environmentManager = new EnvironmentManager(logger);
  const {
    node: nodeEnv,
    jwt: jwtEnv,
    httpServer: httpServerEnv,
    websocketServer: websocketServerEnv,
    database: databaseEnv,
    messageQueue: messageQueueEnv,
  } = environmentManager.getEnvVariables();

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
        retryLimit: 5,
      },
    },
    messageQueueParams: {
      connectionOptions: { url: messageQueueEnv.url },
    },
    websocketServerParams: {
      path: `/${websocketServerEnv.route}`,
      pingTime: websocketServerEnv.pingTime,
      backlog: websocketServerEnv.backlog,
      maxPayload: websocketServerEnv.maxPayload,
    },
    allowedMethods: httpServerEnv.allowedMethods,
    routes: {
      http: `/${httpServerEnv.route}`,
    },
    httpServerConfigurations: httpServerEnv.configurations,
    logMiddleware: logger.getLogMiddleware(),
    logger,
  });

  await server.listen(httpServerEnv.port);

  attachProcessHandlers(server, logger);
}

/**********************************************************************************/

function attachProcessHandlers(server: HttpServer, logger: Logger) {
  process
    .on('warning', logger.warn)
    .once('unhandledRejection', (reason: unknown) => {
      logger.fatal(`Unhandled rejection:`, reason);
      closeServer(server, ERROR_CODES.EXIT_RESTART);
    })
    .once('uncaughtException', (error: unknown) => {
      logger.fatal(`Unhandled exception:`, error);
      closeServer(server, ERROR_CODES.EXIT_RESTART);
    });

  const signalHandler = () => {
    closeServer(server, ERROR_CODES.EXIT_NO_RESTART);
  };
  SIGNALS.forEach((signal) => {
    process.once(signal, signalHandler);
  });
}

function closeServer(server: HttpServer, code: number) {
  // eslint-disable-next-line @typescript-eslint/no-floating-promises
  server.close().finally(() => {
    process.exit(code);
  });
}

/**********************************************************************************/

await startServer();
