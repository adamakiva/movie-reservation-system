/**
 * DON'T change the import to the local one, this needs to happen before everything.
 * This makes sure the first thing the code does is changing the captureRejections
 * option to true to account for all new instances of EventEmitter. If every
 * module only exports functions and has no global variables, then, in theory
 * you could do it in a later stage. With that said we don't want to trust the
 * initialization order, so we make sure it is the first thing that is being done
 * When the server runs
 */
import { EventEmitter } from 'node:events';
import { globalAgent } from 'node:http';
import { Stream } from 'node:stream';

// See: https://nodejs.org/api/events.html#capture-rejections-of-promises
EventEmitter.captureRejections = true;

// To prevent DOS attacks, See: https://nodejs.org/en/learn/getting-started/security-best-practices#denial-of-service-of-http-server-cwe-400
globalAgent.maxSockets = 256;
globalAgent.maxTotalSockets = 2048;

// Limit the stream internal buffer to 256kb (default is 64kb)
Stream.setDefaultHighWaterMark(false, 262_144);

/**********************************************************************************/

import { HttpServer } from './server/index.js';
import {
  CONFIGURATIONS,
  EnvironmentManager,
  ERROR_CODES,
  Logger,
  resolve,
  type LoggerHandler,
} from './utils/index.js';

/**********************************************************************************/

async function startServer() {
  const { logger, logMiddleware } = createLogger();

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
    mode,
    authenticationParams: {
      audience: 'mrs-users',
      issuer: 'mrs-server',
      typ: 'JWT',
      alg: 'RS256',
      access: {
        expiresAt: 900_000, // 15 minutes
      },
      refresh: {
        expiresAt: 2_629_746_000, // A month
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
      maxAge: 86_400, // 1 day in seconds
      optionsSuccessStatus: 200, // last option here: https://github.com/expressjs/cors?tab=readme-ov-file#configuration-options
    },
    databaseParams: {
      url: databaseUrl,
      options: {
        max: CONFIGURATIONS.POSTGRES.POOL_MAX_CONNECTIONS,
        connection: {
          application_name: 'movie_reservation_system_pg',
          statement_timeout: CONFIGURATIONS.POSTGRES.STATEMENT_TIMEOUT,
          idle_in_transaction_session_timeout:
            CONFIGURATIONS.POSTGRES.IDLE_IN_TRANSACTION_SESSION_TIMEOUT,
        },
      },
      healthCheckQuery: 'SELECT NOW()',
    },
    allowedMethods: serverEnvironment.allowedMethods,
    routes: {
      http: `/${serverEnvironment.httpRoute}`,
      health: `/${serverEnvironment.healthCheckRoute}`,
    },
    logMiddleware,
    logger,
  });

  await server.listen(parseInt(serverEnvironment.port));

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
    .once('SIGINT', signalHandler(server))
    .once('SIGQUIT', signalHandler(server))
    .once('SIGTERM', signalHandler(server))
    .once(
      'unhandledRejection',
      globalErrorHandler({ server, reason: 'rejection', logger }),
    )
    .once(
      'uncaughtException',
      globalErrorHandler({ server, reason: 'exception', logger }),
    );
}

/**********************************************************************************/

await startServer();
