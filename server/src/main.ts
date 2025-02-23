import { EventEmitter } from 'node:events';
import { globalAgent } from 'node:http';
import { join, resolve } from 'node:path';

import { HttpServer } from './server/index.ts';
import {
  EnvironmentManager,
  ERROR_CODES,
  Logger,
  MESSAGE_QUEUE,
  SIGNALS,
  type LoggerHandler,
} from './utils/index.ts';

/**********************************************************************************/

async function startServer() {
  const { logger, logMiddleware } = createLogger();

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

  // To prevent DOS attacks, See: https://nodejs.org/en/learn/getting-started/security-best-practices#denial-of-service-of-http-server-cwe-400
  globalAgent.maxSockets = node.maxSockets;
  globalAgent.maxTotalSockets = node.maxTotalSockets;

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
      saveDir: join(import.meta.dirname, '..', 'posters'),
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
          statement_timeout: database.statementTimeout,
          idle_in_transaction_session_timeout: database.transactionTimeout,
        },
      },
      // Alive vs Readiness check boils down to the following:
      // Should we restart the pod (isAlive) OR redirect the traffic to a different pod (isReady)
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
    logMiddleware,
    logger,
  });

  await server.listen(serverEnv.port);

  attachProcessHandlers(server, logger);
}

/**********************************************************************************/

function createLogger() {
  const logger = new Logger();

  return {
    logger: logger.getHandler(),
    logMiddleware: logger.getLogMiddleware(),
  } as const;
}

function signalHandler(server: HttpServer) {
  return () => {
    server.close();

    process.exit(ERROR_CODES.EXIT_NO_RESTART);
  };
}

function globalErrorHandler(params: {
  server: HttpServer;
  reason: 'exception' | 'rejection';
  logger: LoggerHandler;
}) {
  const { server, reason, logger } = params;

  return (err: unknown) => {
    logger.fatal(err, `Unhandled ${reason}`);

    server.close();

    // See: https://cheatsheetseries.owasp.org/cheatsheets/Nodejs_Security_Cheat_Sheet.html#error-exception-handling
    process.exit(ERROR_CODES.EXIT_RESTART);
  };
}

function attachProcessHandlers(server: HttpServer, logger: LoggerHandler) {
  process
    .on('warning', logger.warn)
    .once(
      'unhandledRejection',
      globalErrorHandler({ server, reason: 'rejection', logger }),
    )
    .once(
      'uncaughtException',
      globalErrorHandler({ server, reason: 'exception', logger }),
    );

  SIGNALS.forEach((signal) => {
    process.once(signal, signalHandler(server));
  });
}

/**********************************************************************************/

await startServer();
