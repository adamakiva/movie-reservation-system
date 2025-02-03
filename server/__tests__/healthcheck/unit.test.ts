import * as controller from '../../src/entities/healthcheck/controller.ts';

import {
  after,
  assert,
  before,
  createHttpMocks,
  GeneralError,
  HTTP_STATUS_CODES,
  initServer,
  mockLogger,
  PostgresError,
  suite,
  terminateServer,
  test,
  type LoggerHandler,
  type ResponseWithContext,
  type ServerParams,
} from '../utils.ts';

/**********************************************************************************/

await suite('Healthcheck unit tests', async () => {
  let logger: LoggerHandler = null!;
  let serverParams: ServerParams = null!;
  before(async () => {
    ({ logger } = mockLogger());
    serverParams = await initServer();
  });
  after(() => {
    terminateServer(serverParams);
  });

  await suite('Validation layer', async () => {
    await test('Invalid - Liveness validation: Invalid methods', (context) => {
      const disallowedMethods = [
        'POST',
        'PATCH',
        'PUT',
        'DELETE',
        'OPTIONS',
      ] as const;

      const livenessHealthCheckMock = context.mock.fn(
        controller.livenessHealthCheck,
      );

      disallowedMethods.forEach((disallowedMethod) => {
        const { request, response } = createHttpMocks<ResponseWithContext>({
          logger: logger,
          reqOptions: {
            method: disallowedMethod,
          },
        });

        assert.throws(
          () => {
            livenessHealthCheckMock(request, response);
          },
          (err: GeneralError) => {
            assert.strictEqual(err instanceof GeneralError, true);
            assert.strictEqual(
              err.getClientError(response).code,
              HTTP_STATUS_CODES.NOT_ALLOWED,
            );

            return true;
          },
        );

        assert.strictEqual(
          typeof response._getHeaders().allow === 'string',
          true,
        );
      });
    });
    await test('Invalid - Readiness validation: Invalid methods', async (context) => {
      const disallowedMethods = [
        'POST',
        'PATCH',
        'PUT',
        'DELETE',
        'OPTIONS',
      ] as const;

      const readinessHealthCheckMock = context.mock.fn(
        controller.readinessHealthCheck,
      );

      await Promise.all(
        disallowedMethods.map(async (disallowedMethod) => {
          const { request, response } = createHttpMocks<ResponseWithContext>({
            logger: logger,
            reqOptions: {
              method: disallowedMethod,
            },
          });

          await assert.rejects(
            async () => {
              await readinessHealthCheckMock(request, response);
            },
            (err: GeneralError) => {
              assert.strictEqual(err instanceof GeneralError, true);
              assert.strictEqual(
                err.getClientError(response).code,
                HTTP_STATUS_CODES.NOT_ALLOWED,
              );

              return true;
            },
          );

          assert.strictEqual(
            typeof response._getHeaders().allow === 'string',
            true,
          );
        }),
      );
    });
  });
  await suite('Controller layer', async () => {
    await test('Invalid - Controller validation: Application is not ready', async (context) => {
      const { request, response } = createHttpMocks<ResponseWithContext>({
        logger: logger,
        reqOptions: {
          method: 'HEAD',
        },
      });
      // @ts-expect-error Only this function is relevant for the test so we ignore
      // the need for additional fields
      response.locals.context.database = {
        isReady: async () => {
          await Promise.reject(new PostgresError('PH'));
        },
      };

      const validateHealthCheckMiddlewareSpy = context.mock.fn(
        controller.readinessHealthCheck,
      );

      await validateHealthCheckMiddlewareSpy(request, response);

      assert.strictEqual(
        response._getStatusCode(),
        HTTP_STATUS_CODES.GATEWAY_TIMEOUT,
      );
    });
  });
});
