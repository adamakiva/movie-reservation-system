/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import {
  after,
  assert,
  before,
  clearDatabase,
  CONSTANTS,
  generateHallsData,
  getAdminTokens,
  HTTP_STATUS_CODES,
  initServer,
  randomAlphaNumericString,
  randomUUID,
  seedHall,
  seedHalls,
  sendHttpRequest,
  suite,
  terminateServer,
  test,
  type Hall,
  type ServerParams,
} from '../../tests/utils.ts';

/**********************************************************************************/

await suite('Hall integration tests', async () => {
  let server: ServerParams['server'] = null!;
  let database: ServerParams['database'] = null!;
  let httpRoute: ServerParams['routes']['http'] = null!;
  before(async () => {
    ({
      server,
      database,
      routes: { http: httpRoute },
    } = await initServer());
  });
  after(async () => {
    await terminateServer(server);
  });

  await test('Valid - Read many', async () => {
    const { accessToken } = await getAdminTokens(httpRoute);
    const createdHalls = await seedHalls(database, 32);

    try {
      const { statusCode, responseBody: fetchedHalls } = await sendHttpRequest<
        'GET',
        'json',
        Hall[]
      >({
        route: `${httpRoute}/halls`,
        method: 'GET',
        headers: { Authorization: accessToken },
        responseType: 'json',
      });
      assert.strictEqual(statusCode, HTTP_STATUS_CODES.SUCCESS);

      createdHalls.forEach((hall) => {
        const matchingHall = fetchedHalls.find((fetchedHall) => {
          return fetchedHall.id === hall.id;
        });

        assert.deepStrictEqual(hall, matchingHall);
      });
    } finally {
      await clearDatabase(database);
    }
  });
  await test('Valid - Read a lot', async () => {
    const { accessToken } = await getAdminTokens(httpRoute);
    const createdHalls = await seedHalls(database, 8_192);

    try {
      const { statusCode, responseBody: fetchedHalls } = await sendHttpRequest<
        'GET',
        'json',
        Hall[]
      >({
        route: `${httpRoute}/halls`,
        method: 'GET',
        headers: { Authorization: accessToken },
        responseType: 'json',
      });
      assert.strictEqual(statusCode, HTTP_STATUS_CODES.SUCCESS);

      createdHalls.forEach((hall) => {
        const matchingHall = fetchedHalls.find((fetchedHall) => {
          return fetchedHall.id === hall.id;
        });

        assert.deepStrictEqual(hall, matchingHall);
      });
    } finally {
      await clearDatabase(database);
    }
  });
  await test('Invalid - Create request with excess size', async () => {
    const { accessToken } = await getAdminTokens(httpRoute);

    const { statusCode } = await sendHttpRequest<'POST'>({
      route: `${httpRoute}/halls`,
      method: 'POST',
      headers: { Authorization: accessToken },
      payload: {
        name: randomAlphaNumericString(CONSTANTS.ONE_MEGABYTE),
      },
      responseType: 'bytes',
    });

    assert.strictEqual(statusCode, HTTP_STATUS_CODES.CONTENT_TOO_LARGE);
  });
  await test('Valid - Create', async () => {
    const { accessToken } = await getAdminTokens(httpRoute);

    const hallData = generateHallsData()[0]!;

    try {
      const {
        statusCode,
        responseBody: { id, ...fields },
      } = await sendHttpRequest<'POST', 'json', Hall>({
        route: `${httpRoute}/halls`,
        method: 'POST',
        headers: { Authorization: accessToken },
        payload: hallData,
        responseType: 'json',
      });
      assert.strictEqual(statusCode, HTTP_STATUS_CODES.CREATED);

      assert.strictEqual(typeof id === 'string', true);
      assert.deepStrictEqual(
        { ...hallData, name: hallData.name.toLowerCase() },
        fields,
      );
    } finally {
      await clearDatabase(database);
    }
  });
  await test('Invalid - Update request with excess size', async () => {
    const { accessToken } = await getAdminTokens(httpRoute);

    const { statusCode } = await sendHttpRequest<'PUT'>({
      route: `${httpRoute}/halls/${randomUUID()}`,
      method: 'PUT',
      headers: { Authorization: accessToken },
      payload: {
        name: randomAlphaNumericString(CONSTANTS.ONE_MEGABYTE),
      },
      responseType: 'bytes',
    });

    assert.strictEqual(statusCode, HTTP_STATUS_CODES.CONTENT_TOO_LARGE);
  });
  await test('Valid - Update', async () => {
    const { accessToken } = await getAdminTokens(httpRoute);
    const createdHall = await seedHall(database);

    const updatedHallData = generateHallsData()[0]!;

    try {
      const { statusCode, responseBody: updatedHall } = await sendHttpRequest<
        'PUT',
        'json',
        Hall
      >({
        route: `${httpRoute}/halls/${createdHall.id}`,
        method: 'PUT',
        headers: { Authorization: accessToken },
        payload: updatedHallData,
        responseType: 'json',
      });
      assert.strictEqual(statusCode, HTTP_STATUS_CODES.SUCCESS);

      assert.deepStrictEqual(
        {
          ...createdHall,
          ...{
            ...updatedHallData,
            name: updatedHallData.name.toLowerCase(),
          },
        },
        updatedHall,
      );
    } finally {
      await clearDatabase(database);
    }
  });
  await test('Valid - Delete existent hall', async () => {
    let hallId = '';

    const { accessToken } = await getAdminTokens(httpRoute);

    const hallData = generateHallsData()[0]!;

    try {
      const {
        statusCode,
        responseBody: { id },
      } = await sendHttpRequest<'POST', 'json', Hall>({
        route: `${httpRoute}/halls`,
        method: 'POST',
        headers: { Authorization: accessToken },
        payload: hallData,
        responseType: 'json',
      });
      assert.strictEqual(statusCode, HTTP_STATUS_CODES.CREATED);
      hallId = id;

      const result = await sendHttpRequest<'DELETE', 'text', string>({
        route: `${httpRoute}/halls/${hallId}`,
        method: 'DELETE',
        headers: { Authorization: accessToken },
        responseType: 'text',
      });

      assert.strictEqual(result.statusCode, HTTP_STATUS_CODES.NO_CONTENT);
      assert.strictEqual(result.responseBody, '');
    } finally {
      await clearDatabase(database);
    }
  });
  await test('Valid - Delete non-existent hall', async () => {
    const { accessToken } = await getAdminTokens(httpRoute);

    const { statusCode, responseBody } = await sendHttpRequest<
      'DELETE',
      'text',
      string
    >({
      route: `${httpRoute}/halls/${randomUUID()}`,
      method: 'DELETE',
      headers: { Authorization: accessToken },
      responseType: 'text',
    });

    assert.strictEqual(statusCode, HTTP_STATUS_CODES.NO_CONTENT);
    assert.strictEqual(responseBody, '');
  });
});
