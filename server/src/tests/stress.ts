import { kill } from 'node:process';

import autocannon, { type Request } from 'autocannon';

import { Database } from '../database/index.ts';
import { EnvironmentManager, Logger } from '../utils/index.ts';

import { setTimeout } from 'node:timers/promises';
import {
  clearDatabase,
  randomAlphaNumericString,
  sendHttpRequest,
} from './utils.ts';

/**********************************************************************************/

async function stressTest() {
  const { url, database, serverEnv, logger } = setup();

  const accessToken = await generateAccessToken(
    `${url}/${serverEnv.httpRoute}/login`,
  );
  const roleTests = generateRoleTests(serverEnv.httpRoute, accessToken);

  const result = await autocannon({
    url,
    connections: 16,
    duration: 32,
    timeout: 8,
    bailout: 16,
    reconnectRate: 32,
    title: 'Stress tests',
    // Not using idReplacement since, for some reason it does not work.
    // So we just modify the request fields directly
    //@ts-expect-error Missing the function declaration in the definitelyTyped
    // package
    requests: [...roleTests],
  });

  // Allow any hanging resources (I/O, connections, etc...) time to shutdown
  await setTimeout(2_000);

  await clearDatabase(database);
  await database.close();

  logger.info(autocannon.printResult(result));

  kill(process.pid, 'SIGINT');
}

function setup() {
  const logger = new Logger();
  const {
    server: serverEnv,
    database: { url, maxConnections, statementTimeout, transactionTimeout },
  } = new EnvironmentManager(logger).getEnvVariables();
  const database = new Database({
    url: url,
    options: {
      max: maxConnections,
      connection: {
        statement_timeout: statementTimeout,
        idle_in_transaction_session_timeout: transactionTimeout,
      },
    },
    // Alive vs Readiness check boils down to:
    // Should we restart the pod OR redirect the traffic to a different pod
    isAliveQuery: 'SELECT NOW()',
    isReadyQuery: 'SELECT NOW()',
    logger,
  });

  return {
    url: `${serverEnv.baseUrl}:${serverEnv.port}`,
    database,
    serverEnv,
    logger,
  };
}

async function generateAccessToken(route: string) {
  const email = process.env.ADMIN_EMAIL!;
  const password = process.env.ADMIN_PASSWORD!;

  const {
    responseBody: { accessToken },
  } = await sendHttpRequest<
    'POST',
    'json',
    { accessToken: string; refreshToken: string }
  >({
    route,
    method: 'POST',
    payload: { email, password },
    responseType: 'json',
  });

  return accessToken;
}

function generateRoleTests(baseRoute: string, accessToken: string) {
  return [
    {
      //@ts-expect-error Missing the function declaration in the definitelyTyped
      // package
      setupRequest: (request: Request) => {
        return {
          ...request,
          method: 'GET',
          path: `/${baseRoute}/roles`,
          headers: { authorization: accessToken },
        } as const;
      },
    },
    {
      //@ts-expect-error Missing the function declaration in the definitelyTyped
      // package
      setupRequest: (request: Request) => {
        return {
          ...request,
          method: 'POST',
          path: `/${baseRoute}/roles`,
          headers: {
            'Content-type': 'application/json; charset=utf-8',
            authorization: accessToken,
          },
          body: JSON.stringify({ name: randomAlphaNumericString(16) }),
        } as const;
      },
    },
  ] satisfies autocannon.Request[];
}

/**********************************************************************************/

await stressTest();
