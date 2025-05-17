import { kill } from 'node:process';
import { setTimeout } from 'node:timers/promises';

import autocannon from 'autocannon';

import {
  seedShowtimes,
  seedUsers,
  sendHttpRequest,
  terminateServer,
  VALIDATION,
} from '../utils.ts';

import { handler } from './server.ts';

/**********************************************************************************/

const maxPageSize = VALIDATION.PAGINATION.PAGE_SIZE.MAX_LENGTH.VALUE;

/**********************************************************************************/

async function stressTest() {
  const {
    env: {
      httpServer: {
        configurations: { maxRequestsPerSocket },
      },
    },
    server,
    routes: { http: httpRoute },
    authentication,
    database,
    logger,
  } = handler;

  const results = await Promise.allSettled([
    generateAccessToken(`${httpRoute}/login`),
    seedUsers(authentication, database, maxPageSize, false, 1),
    seedShowtimes(database, maxPageSize, 1),
  ]);
  await Promise.all(
    results.map(async (result) => {
      if (result.status === 'rejected') {
        await terminateServer(server, database);
        process.exit(1);
      }
    }),
  );

  const accessToken = (results[0] as PromiseFulfilledResult<string>).value;
  const roleTests = generateTests(httpRoute, accessToken);

  console.info('Running stress tests, this may take a bit...\n');

  const instance = autocannon(
    {
      url: httpRoute,
      connections: 100,
      duration: 60,
      timeout: 8,
      bailout: 1,
      reconnectRate: maxRequestsPerSocket,
      title: 'Stress tests',
      // Not using idReplacement since, for some reason it does not work.
      // So we just modify the request fields directly
      requests: [...roleTests],
    },
    async (error, result) => {
      if (error) {
        console.error('Stress test failure:', error);
      }

      try {
        // Allow any hanging resources (I/O, connections, etc...) time to shutdown
        await setTimeout(2_000);
      } catch {
        // On purpose
      }

      // Can't throw
      await terminateServer(server, database);

      logger.info(autocannon.printResult(result));

      kill(process.pid, 'SIGINT');
    },
  );

  autocannon.track(instance, { outputStream: process.stdout });
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

function generateTests(baseRoute: string, accessToken: string) {
  return [
    {
      setupRequest: (request) => {
        return {
          ...request,
          method: 'GET',
          path: `${baseRoute}/genres`,
          headers: { authorization: accessToken },
        } as const;
      },
    },
    {
      setupRequest: (request) => {
        return {
          ...request,
          method: 'GET',
          path: `${baseRoute}/halls`,
          headers: { authorization: accessToken },
        } as const;
      },
    },
    {
      setupRequest: (request) => {
        return {
          ...request,
          method: 'GET',
          path: `${baseRoute}/movies?page-size=${maxPageSize}`,
          headers: { authorization: accessToken },
        } as const;
      },
    },
    {
      setupRequest: (request) => {
        return {
          ...request,
          method: 'GET',
          path: `${baseRoute}/roles`,
          headers: { authorization: accessToken },
        } as const;
      },
    },
    {
      setupRequest: (request) => {
        return {
          ...request,
          method: 'GET',
          path: `${baseRoute}/showtimes?page-size=${maxPageSize}`,
          headers: { authorization: accessToken },
        } as const;
      },
    },
    {
      setupRequest: (request) => {
        return {
          ...request,
          method: 'GET',
          path: `${baseRoute}/users?page-size=${maxPageSize}`,
          headers: { authorization: accessToken },
        } as const;
      },
    },
  ] as const satisfies autocannon.Request[];
}

/**********************************************************************************/

await stressTest();
