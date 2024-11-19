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

// See: https://nodejs.org/api/events.html#capture-rejections-of-promises
EventEmitter.captureRejections = true;

/**********************************************************************************/

import { HttpServer } from './server/index.js';
import { EnvironmentManager, ERROR_CODES, VALIDATION } from './utils/index.js';

/**********************************************************************************/

function signalHandler(server: HttpServer) {
  return () => {
    server.close();

    process.exit(ERROR_CODES.EXIT_NO_RESTART);
  };
}

function globalErrorHandler(
  server: HttpServer,
  reason: 'exception' | 'rejection',
) {
  return (err: unknown) => {
    console.error(err, `Unhandled ${reason}`);

    server.close();

    // See: https://cheatsheetseries.owasp.org/cheatsheets/Nodejs_Security_Cheat_Sheet.html#error-exception-handling
    process.exit(ERROR_CODES.EXIT_RESTART);
  };
}

function attachProcessHandlers(server: HttpServer) {
  process
    .on('warning', console.warn)
    .once('SIGINT', signalHandler(server))
    .once('SIGQUIT', signalHandler(server))
    .once('SIGTERM', signalHandler(server))
    .once('unhandledRejection', globalErrorHandler(server, 'rejection'))
    .once('uncaughtException', globalErrorHandler(server, 'exception'));
}

/**********************************************************************************/

async function startServer() {
  const environmentManager = new EnvironmentManager();
  const {
    mode,
    server: serverEnv,
    dbUrl,
  } = environmentManager.getEnvVariables();

  const server = await HttpServer.create({
    mode: mode,
    dbParams: {
      url: dbUrl,
      options: {
        max: VALIDATION.POSTGRES.POOL_MAX_CONNECTIONS,
        connection: {
          application_name: 'movie_reservation_system_pg',
          statement_timeout: VALIDATION.POSTGRES.STATEMENT_TIMEOUT,
          idle_in_transaction_session_timeout:
            VALIDATION.POSTGRES.IDLE_IN_TRANSACTION_SESSION_TIMEOUT,
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
  });

  await server.listen(serverEnv.port);

  attachProcessHandlers(server);
}

/**********************************************************************************/

await startServer();
