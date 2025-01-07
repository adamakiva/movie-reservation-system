import {
  after,
  assert,
  before,
  CONSTANTS,
  getAdminTokens,
  HTTP_STATUS_CODES,
  initServer,
  randomNumber,
  randomString,
  randomUUID,
  sendHttpRequest,
  suite,
  terminateServer,
  test,
  VALIDATION,
  type ServerParams,
} from '../utils.js';

import {
  deleteHalls,
  generateHallsData,
  seedHall,
  seedHalls,
  type Hall,
} from './utils.js';

/**********************************************************************************/

const { HALL } = VALIDATION;

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
    const { createdHalls, hallIds } = await seedHalls(serverParams, 32);

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
      await deleteHalls(serverParams, ...hallIds);
    }
  });
  await test('Valid - Read a lot', async () => {
    const { accessToken } = await getAdminTokens(serverParams);
    const { createdHalls, hallIds } = await seedHalls(serverParams, 8_192);

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
      await deleteHalls(serverParams, ...hallIds);
    }
  });
  await test('Invalid - Create request with excess size', async () => {
    const { status } = await sendHttpRequest({
      route: `${serverParams.routes.http}/halls`,
      method: 'POST',
      payload: { name: randomString(CONSTANTS.ONE_MEGABYTE_IN_BYTES) },
    });

    assert.strictEqual(status, HTTP_STATUS_CODES.CONTENT_TOO_LARGE);
  });
  await test('Valid - Create', async () => {
    let hallId = '';

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
      hallId = id;
      assert.strictEqual(typeof id === 'string', true);
      assert.deepStrictEqual(
        { ...hallData, name: hallData.name.toLowerCase() },
        fields,
      );
    } finally {
      await deleteHalls(serverParams, hallId);
    }
  });
  await test('Invalid - Update request with excess size', async () => {
    const { status } = await sendHttpRequest({
      route: `${serverParams.routes.http}/halls/${randomUUID()}`,
      method: 'PUT',
      payload: { name: randomString(CONSTANTS.ONE_MEGABYTE_IN_BYTES) },
    });

    assert.strictEqual(status, HTTP_STATUS_CODES.CONTENT_TOO_LARGE);
  });
  await test('Valid - Update', async () => {
    const { accessToken } = await getAdminTokens(serverParams);
    const { createdHall, hallIds } = await seedHall(serverParams);

    const updatedHallData = {
      name: randomString(HALL.NAME.MAX_LENGTH.VALUE - 1),
      rows: randomNumber(
        HALL.ROWS.MIN_LENGTH.VALUE + 1,
        HALL.ROWS.MAX_LENGTH.VALUE - 1,
      ),
      columns: randomNumber(
        HALL.COLUMNS.MIN_LENGTH.VALUE + 1,
        HALL.COLUMNS.MAX_LENGTH.VALUE - 1,
      ),
    } as const;

    try {
      const res = await sendHttpRequest({
        route: `${serverParams.routes.http}/halls/${hallIds[0]}`,
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
      await deleteHalls(serverParams, ...hallIds);
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
      await deleteHalls(serverParams, hallId);
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
