import {
  after,
  assert,
  before,
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

import { deleteHalls, seedHall, seedHalls, type Hall } from './utils.js';

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
    const hallIds: string[] = [];
    // Not concurrent on purpose, allows for easier error handling and speed is
    // irrelevant for the tests. Reason being if the creation is finished before
    // the failure of the tokens fetch we will need to clean them up. This way
    // we don't have to
    const { accessToken } = await getAdminTokens(serverParams);
    const halls = await seedHalls(serverParams, 32);
    hallIds.push(
      ...halls.map(({ id }) => {
        return id;
      }),
    );

    try {
      const res = await sendHttpRequest({
        route: `${serverParams.routes.http}/halls`,
        method: 'GET',
        headers: { Authorization: accessToken },
      });
      assert.strictEqual(res.status, HTTP_STATUS_CODES.SUCCESS);

      const fetchedHalls = (await res.json()) as Hall[];
      halls.forEach((hall) => {
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
    const hallIds: string[] = [];
    // Not concurrent on purpose, allows for easier error handling and speed is
    // irrelevant for the tests. Reason being if the creation is finished before
    // the failure of the tokens fetch we will need to clean them up. This way
    // we don't have to
    const { accessToken } = await getAdminTokens(serverParams);
    const halls = await seedHalls(serverParams, 8_192);
    hallIds.push(
      ...halls.map(({ id }) => {
        return id;
      }),
    );

    try {
      const res = await sendHttpRequest({
        route: `${serverParams.routes.http}/halls`,
        method: 'GET',
        headers: { Authorization: accessToken },
      });
      assert.strictEqual(res.status, HTTP_STATUS_CODES.SUCCESS);

      const fetchedHalls = (await res.json()) as Hall[];
      halls.forEach((hall) => {
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
      payload: { name: randomString(1_000_000) },
    });

    assert.strictEqual(status, HTTP_STATUS_CODES.CONTENT_TOO_LARGE);
  });
  await test('Valid - Create', async () => {
    const hallIds: string[] = [];

    const { accessToken } = await getAdminTokens(serverParams);

    const hallData = {
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
        route: `${serverParams.routes.http}/halls`,
        method: 'POST',
        headers: { Authorization: accessToken },
        payload: hallData,
      });
      assert.strictEqual(res.status, HTTP_STATUS_CODES.CREATED);

      const { id, ...fields } = (await res.json()) as Hall;
      hallIds.push(id);
      assert.strictEqual(typeof id === 'string', true);
      assert.deepStrictEqual(
        { ...hallData, name: hallData.name.toLowerCase() },
        fields,
      );
    } finally {
      await deleteHalls(serverParams, ...hallIds);
    }
  });
  await test('Invalid - Update request with excess size', async () => {
    const { status } = await sendHttpRequest({
      route: `${serverParams.routes.http}/halls/${randomUUID()}`,
      method: 'PUT',
      payload: { name: randomString(1_000_000) },
    });

    assert.strictEqual(status, HTTP_STATUS_CODES.CONTENT_TOO_LARGE);
  });
  await test('Valid - Update', async () => {
    const hallIds: string[] = [];

    // Not concurrent on purpose, allows for easier error handling and speed is
    // irrelevant for the tests. Reason being if the creation is finished before
    // the failure of the tokens fetch we will need to clean them up. This way
    // we don't have to
    const { accessToken } = await getAdminTokens(serverParams);
    const hall = await seedHall(serverParams);
    hallIds.push(hall.id);

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
        route: `${serverParams.routes.http}/halls/${hall.id}`,
        method: 'PUT',
        headers: { Authorization: accessToken },
        payload: updatedHallData,
      });
      assert.strictEqual(res.status, HTTP_STATUS_CODES.SUCCESS);

      const updatedHall = await res.json();
      assert.deepStrictEqual(
        {
          ...hall,
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
    const hallIds: string[] = [];

    const { accessToken } = await getAdminTokens(serverParams);

    const hallData = {
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
      let res = await sendHttpRequest({
        route: `${serverParams.routes.http}/halls`,
        method: 'POST',
        headers: { Authorization: accessToken },
        payload: hallData,
      });
      assert.strictEqual(res.status, HTTP_STATUS_CODES.CREATED);

      const { id } = (await res.json()) as Hall;
      hallIds.push(id);

      res = await sendHttpRequest({
        route: `${serverParams.routes.http}/halls/${id}`,
        method: 'DELETE',
        headers: { Authorization: accessToken },
      });

      const responseBody = await res.text();

      assert.strictEqual(res.status, HTTP_STATUS_CODES.NO_CONTENT);
      assert.strictEqual(responseBody, '');
    } finally {
      await deleteHalls(serverParams, ...hallIds);
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
