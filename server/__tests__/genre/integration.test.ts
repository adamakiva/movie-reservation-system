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

import {
  generateGenresData,
  seedGenre,
  seedGenres,
  type Genre,
} from './utils.ts';

/**********************************************************************************/

await suite('Genre integration tests', async () => {
  let serverParams: ServerParams = null!;
  before(async () => {
    serverParams = await initServer();
  });
  after(() => {
    terminateServer(serverParams);
  });

  await test('Valid - Read many', async () => {
    const { accessToken } = await getAdminTokens(serverParams);
    const createdGenres = await seedGenres(serverParams, 32);

    try {
      const res = await sendHttpRequest({
        route: `${serverParams.routes.http}/genres`,
        method: 'GET',
        headers: { Authorization: accessToken },
      });
      assert.strictEqual(res.status, HTTP_STATUS_CODES.SUCCESS);

      const fetchedGenres = (await res.json()) as Genre[];
      createdGenres.forEach((genre) => {
        const matchingGenre = fetchedGenres.find((fetchedGenre) => {
          return fetchedGenre.id === genre.id;
        });

        assert.deepStrictEqual(genre, matchingGenre);
      });
    } finally {
      await clearDatabase(serverParams);
    }
  });
  await test('Valid - Read a lot', async () => {
    const { accessToken } = await getAdminTokens(serverParams);
    const createdGenres = await seedGenres(serverParams, 8_192);

    try {
      const res = await sendHttpRequest({
        route: `${serverParams.routes.http}/genres`,
        method: 'GET',
        headers: { Authorization: accessToken },
      });
      assert.strictEqual(res.status, HTTP_STATUS_CODES.SUCCESS);

      const fetchedGenres = (await res.json()) as Genre[];
      createdGenres.forEach((genre) => {
        const matchingGenre = fetchedGenres.find((fetchedGenre) => {
          return fetchedGenre.id === genre.id;
        });

        assert.deepStrictEqual(genre, matchingGenre);
      });
    } finally {
      await clearDatabase(serverParams);
    }
  });
  await test('Invalid - Create request with excess size', async () => {
    const { status } = await sendHttpRequest({
      route: `${serverParams.routes.http}/genres`,
      method: 'POST',
      payload: {
        name: randomAlphaNumericString(CONSTANTS.ONE_MEGABYTE_IN_BYTES),
      },
    });

    assert.strictEqual(status, HTTP_STATUS_CODES.CONTENT_TOO_LARGE);
  });
  await test('Valid - Create', async () => {
    const { accessToken } = await getAdminTokens(serverParams);

    const genreData = generateGenresData()[0]!;

    try {
      const res = await sendHttpRequest({
        route: `${serverParams.routes.http}/genres`,
        method: 'POST',
        headers: { Authorization: accessToken },
        payload: genreData,
      });
      assert.strictEqual(res.status, HTTP_STATUS_CODES.CREATED);

      const { id, ...fields } = (await res.json()) as Genre;
      assert.strictEqual(typeof id === 'string', true);
      assert.deepStrictEqual(
        { ...genreData, name: genreData.name.toLowerCase() },
        fields,
      );
    } finally {
      await clearDatabase(serverParams);
    }
  });
  await test('Invalid - Update request with excess size', async () => {
    const { status } = await sendHttpRequest({
      route: `${serverParams.routes.http}/genres/${randomUUID()}`,
      method: 'PUT',
      payload: {
        name: randomAlphaNumericString(CONSTANTS.ONE_MEGABYTE_IN_BYTES),
      },
    });

    assert.strictEqual(status, HTTP_STATUS_CODES.CONTENT_TOO_LARGE);
  });
  await test('Valid - Update', async () => {
    const { accessToken } = await getAdminTokens(serverParams);
    const createdGenre = await seedGenre(serverParams);

    const updatedGenreData = generateGenresData()[0]!;

    try {
      const res = await sendHttpRequest({
        route: `${serverParams.routes.http}/genres/${createdGenre.id}`,
        method: 'PUT',
        headers: { Authorization: accessToken },
        payload: updatedGenreData,
      });
      assert.strictEqual(res.status, HTTP_STATUS_CODES.SUCCESS);

      const updatedGenre = await res.json();
      assert.deepStrictEqual(
        {
          ...createdGenre,
          ...{
            ...updatedGenreData,
            name: updatedGenreData.name.toLowerCase(),
          },
        },
        updatedGenre,
      );
    } finally {
      await clearDatabase(serverParams);
    }
  });
  await test('Valid - Delete existent genre', async () => {
    let genreId = '';

    const { accessToken } = await getAdminTokens(serverParams);

    const genreData = generateGenresData()[0]!;

    try {
      let res = await sendHttpRequest({
        route: `${serverParams.routes.http}/genres`,
        method: 'POST',
        headers: { Authorization: accessToken },
        payload: genreData,
      });
      assert.strictEqual(res.status, HTTP_STATUS_CODES.CREATED);

      ({ id: genreId } = (await res.json()) as Genre);

      res = await sendHttpRequest({
        route: `${serverParams.routes.http}/genres/${genreId}`,
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
  await test('Valid - Delete non-existent genre', async () => {
    const { accessToken } = await getAdminTokens(serverParams);

    const res = await sendHttpRequest({
      route: `${serverParams.routes.http}/genres/${randomUUID()}`,
      method: 'DELETE',
      headers: { Authorization: accessToken },
    });

    const responseBody = await res.text();

    assert.strictEqual(res.status, HTTP_STATUS_CODES.NO_CONTENT);
    assert.strictEqual(responseBody, '');
  });
});
