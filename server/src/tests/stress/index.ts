import { kill } from 'node:process';
import { setTimeout } from 'node:timers/promises';

import autocannon from 'autocannon';

import {
  randomAlphaNumericString,
  sendHttpRequest,
  terminateServer,
} from '../utils.ts';

import { handler } from './server.ts';

/**********************************************************************************/

async function stressTest() {
  const {
    server,
    routes: { http: httpRoute },
    database,
    logger,
  } = handler;

  const accessToken = await generateAccessToken(`${httpRoute}/login`);
  const roleTests = generateRoleTests(httpRoute, accessToken);

  console.info('Running stress tests, this may take a bit...\n');

  const instance = autocannon(
    {
      url: httpRoute,
      connections: 100,
      duration: 45,
      timeout: 3,
      bailout: 1,
      reconnectRate: 32,
      title: 'Stress tests',
      // Not using idReplacement since, for some reason it does not work.
      // So we just modify the request fields directly
      //@ts-expect-error Missing the function declaration in the definitelyTyped
      // package
      requests: [...roleTests],
    },
    async (err, result) => {
      if (err) {
        console.error(err);
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

function generateRoleTests(baseRoute: string, accessToken: string) {
  return [
    {
      //@ts-expect-error Missing the function declaration in the definitelyTyped
      // package
      setupRequest: (request) => {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return {
          ...request,
          method: 'GET',
          path: `${baseRoute}/roles`,
          headers: { authorization: accessToken },
        } as const;
      },
    },
    {
      //@ts-expect-error Missing the function declaration in the definitelyTyped
      // package
      setupRequest: (request) => {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return {
          ...request,
          method: 'POST',
          path: `${baseRoute}/roles`,
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
