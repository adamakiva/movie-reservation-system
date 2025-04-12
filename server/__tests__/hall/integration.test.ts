/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import {
  after,
  assert,
  before,
  clearDatabase,
  CONSTANTS,
  getAdminTokens,
  HTTP_STATUS_CODES,
  initServer,
  randomAlphaNumericString,
  randomUUID,
  sendHttpRequest,
  suite,
  terminateServer,
  test,
  type ServerParams,
} from '../utils.ts';

import { generateHallsData, seedHall, seedHalls, type Hall } from './utils.ts';

/**********************************************************************************/

await suite('Hall integration tests', async () => {
  let serverParams: ServerParams = null!;
  before(async () => {
    serverParams = await initServer();
  });
  after(() => {
    terminateServer(serverParams);
  });

  await test('Valid - Read many', async () => {
    const { accessToken } = await getAdminTokens(serverParams);
    const createdHalls = await seedHalls(serverParams, 32);

    try {
      const res = await sendHttpRequest({
        route: `${serverParams.routes.http}/halls`,
        method: 'GET',
        headers: { Authorization: accessToken },
      });
      assert.strictEqual(res.status, HTTP_STATUS_CODES.SUCCESS);

      const fetchedHalls = (await res.json()) as Hall[];
      createdHalls.forEach((hall) => {
        const matchingHall = fetchedHalls.find((fetchedHall) => {
          return fetchedHall.id === hall.id;
        });

        assert.deepStrictEqual(hall, matchingHall);
      });
    } finally {
      await clearDatabase(serverParams);
    }
  });
  await test('Valid - Read a lot', async () => {
    const { accessToken } = await getAdminTokens(serverParams);
    const createdHalls = await seedHalls(serverParams, 8_192);

    try {
      const res = await sendHttpRequest({
        route: `${serverParams.routes.http}/halls`,
        method: 'GET',
        headers: { Authorization: accessToken },
      });
      assert.strictEqual(res.status, HTTP_STATUS_CODES.SUCCESS);

      const fetchedHalls = (await res.json()) as Hall[];
      createdHalls.forEach((hall) => {
        const matchingHall = fetchedHalls.find((fetchedHall) => {
          return fetchedHall.id === hall.id;
        });

        assert.deepStrictEqual(hall, matchingHall);
      });
    } finally {
      await clearDatabase(serverParams);
    }
  });
  await test('Invalid - Create request with excess size', async () => {
    const { accessToken } = await getAdminTokens(serverParams);

    const { status } = await sendHttpRequest({
      route: `${serverParams.routes.http}/halls`,
      method: 'POST',
      headers: { Authorization: accessToken },
      payload: {
        name: randomAlphaNumericString(CONSTANTS.ONE_MEGABYTE_IN_BYTES),
      },
    });

    assert.strictEqual(status, HTTP_STATUS_CODES.CONTENT_TOO_LARGE);
  });
  await test('Valid - Create', async () => {
    const { accessToken } = await getAdminTokens(serverParams);

    const hallData = generateHallsData()[0]!;

    try {
      const res = await sendHttpRequest({
        route: `${serverParams.routes.http}/halls`,
        method: 'POST',
        headers: { Authorization: accessToken },
        payload: hallData,
      });
      assert.strictEqual(res.status, HTTP_STATUS_CODES.CREATED);

      const { id, ...fields } = (await res.json()) as Hall;
      assert.strictEqual(typeof id === 'string', true);
      assert.deepStrictEqual(
        { ...hallData, name: hallData.name.toLowerCase() },
        fields,
      );
    } finally {
      await clearDatabase(serverParams);
    }
  });
  await test('Invalid - Update request with excess size', async () => {
    const { accessToken } = await getAdminTokens(serverParams);

    const { status } = await sendHttpRequest({
      route: `${serverParams.routes.http}/halls/${randomUUID()}`,
      method: 'PUT',
      headers: { Authorization: accessToken },
      payload: {
        name: randomAlphaNumericString(CONSTANTS.ONE_MEGABYTE_IN_BYTES),
      },
    });

    assert.strictEqual(status, HTTP_STATUS_CODES.CONTENT_TOO_LARGE);
  });
  await test('Valid - Update', async () => {
    const { accessToken } = await getAdminTokens(serverParams);
    const createdHall = await seedHall(serverParams);

    const updatedHallData = generateHallsData()[0]!;

    try {
      const res = await sendHttpRequest({
        route: `${serverParams.routes.http}/halls/${createdHall.id}`,
        method: 'PUT',
        headers: { Authorization: accessToken },
        payload: updatedHallData,
      });
      assert.strictEqual(res.status, HTTP_STATUS_CODES.SUCCESS);

      const updatedHall = await res.json();
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
      await clearDatabase(serverParams);
    }
  });
  await test('Valid - Delete existent hall', async () => {
    let hallId = '';

    const { accessToken } = await getAdminTokens(serverParams);

    const hallData = generateHallsData()[0]!;

    try {
      let res = await sendHttpRequest({
        route: `${serverParams.routes.http}/halls`,
        method: 'POST',
        headers: { Authorization: accessToken },
        payload: hallData,
      });
      assert.strictEqual(res.status, HTTP_STATUS_CODES.CREATED);

      ({ id: hallId } = (await res.json()) as Hall);

      res = await sendHttpRequest({
        route: `${serverParams.routes.http}/halls/${hallId}`,
        method: 'DELETE',
        headers: { Authorization: accessToken },
      });

      const responseBody = await res.text();

      assert.strictEqual(res.status, HTTP_STATUS_CODES.NO_CONTENT);
      assert.strictEqual(responseBody, '');
    } finally {
      await clearDatabase(serverParams);
    }
  });
  await test('Valid - Delete non-existent hall', async () => {
    const { accessToken } = await getAdminTokens(serverParams);

    const res = await sendHttpRequest({
      route: `${serverParams.routes.http}/halls/${randomUUID()}`,
      method: 'DELETE',
      headers: { Authorization: accessToken },
    });

    const responseBody = await res.text();

    assert.strictEqual(res.status, HTTP_STATUS_CODES.NO_CONTENT);
    assert.strictEqual(responseBody, '');
  });
});
