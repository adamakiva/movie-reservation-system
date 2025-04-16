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
      const { statusCode, responseBody: fetchedGenres } = await sendHttpRequest<
        'GET',
        'json',
        Genre[]
      >({
        route: `${serverParams.routes.http}/genres`,
        method: 'GET',
        headers: { Authorization: accessToken },
        responseType: 'json',
      });
      assert.strictEqual(statusCode, HTTP_STATUS_CODES.SUCCESS);

      createdGenres.forEach((genre) => {
        const matchingGenre = fetchedGenres.find((fetchedGenre) => {
          return fetchedGenre.id === genre.id;
        });

        assert.deepStrictEqual(genre, matchingGenre);
      });
    } finally {
      await clearDatabase(serverParams.database);
    }
  });
  await test('Valid - Read a lot', async () => {
    const { accessToken } = await getAdminTokens(serverParams);
    const createdGenres = await seedGenres(serverParams, 8_192);

    try {
      const { statusCode, responseBody: fetchedGenres } = await sendHttpRequest<
        'GET',
        'json',
        Genre[]
      >({
        route: `${serverParams.routes.http}/genres`,
        method: 'GET',
        headers: { Authorization: accessToken },
        responseType: 'json',
      });
      assert.strictEqual(statusCode, HTTP_STATUS_CODES.SUCCESS);

      createdGenres.forEach((genre) => {
        const matchingGenre = fetchedGenres.find((fetchedGenre) => {
          return fetchedGenre.id === genre.id;
        });

        assert.deepStrictEqual(genre, matchingGenre);
      });
    } finally {
      await clearDatabase(serverParams.database);
    }
  });
  await test('Invalid - Create request with excess size', async () => {
    const { accessToken } = await getAdminTokens(serverParams);

    const { statusCode } = await sendHttpRequest<'POST'>({
      route: `${serverParams.routes.http}/genres`,
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
    const { accessToken } = await getAdminTokens(serverParams);

    const genreData = generateGenresData()[0]!;

    try {
      const {
        statusCode,
        responseBody: { id, ...fields },
      } = await sendHttpRequest<'POST', 'json', Genre>({
        route: `${serverParams.routes.http}/genres`,
        method: 'POST',
        headers: { Authorization: accessToken },
        payload: genreData,
        responseType: 'json',
      });
      assert.strictEqual(statusCode, HTTP_STATUS_CODES.CREATED);

      assert.strictEqual(typeof id === 'string', true);
      assert.deepStrictEqual(
        { ...genreData, name: genreData.name.toLowerCase() },
        fields,
      );
    } finally {
      await clearDatabase(serverParams.database);
    }
  });
  await test('Invalid - Update request with excess size', async () => {
    const { accessToken } = await getAdminTokens(serverParams);

    const { statusCode } = await sendHttpRequest<'PUT'>({
      route: `${serverParams.routes.http}/genres/${randomUUID()}`,
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
    const { accessToken } = await getAdminTokens(serverParams);
    const createdGenre = await seedGenre(serverParams);

    const updatedGenreData = generateGenresData()[0]!;

    try {
      const { statusCode, responseBody: updatedGenre } = await sendHttpRequest<
        'PUT',
        'json',
        Genre
      >({
        route: `${serverParams.routes.http}/genres/${createdGenre.id}`,
        method: 'PUT',
        headers: { Authorization: accessToken },
        payload: updatedGenreData,
        responseType: 'json',
      });
      assert.strictEqual(statusCode, HTTP_STATUS_CODES.SUCCESS);

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
      await clearDatabase(serverParams.database);
    }
  });
  await test('Valid - Delete existent genre', async () => {
    let genreId = '';

    const { accessToken } = await getAdminTokens(serverParams);

    const genreData = generateGenresData()[0]!;

    try {
      const createGenreResponse = await sendHttpRequest<'POST', 'json', Genre>({
        route: `${serverParams.routes.http}/genres`,
        method: 'POST',
        headers: { Authorization: accessToken },
        payload: genreData,
        responseType: 'json',
      });
      assert.strictEqual(
        createGenreResponse.statusCode,
        HTTP_STATUS_CODES.CREATED,
      );
      genreId = createGenreResponse.responseBody.id;

      const result = await sendHttpRequest<'DELETE', 'text', string>({
        route: `${serverParams.routes.http}/genres/${genreId}`,
        method: 'DELETE',
        headers: { Authorization: accessToken },
        responseType: 'text',
      });

      assert.strictEqual(result.statusCode, HTTP_STATUS_CODES.NO_CONTENT);
      assert.strictEqual(result.responseBody, '');
    } finally {
      await clearDatabase(serverParams.database);
    }
  });
  await test('Valid - Delete non-existent genre', async () => {
    const { accessToken } = await getAdminTokens(serverParams);

    const { statusCode, responseBody } = await sendHttpRequest<
      'DELETE',
      'text',
      string
    >({
      route: `${serverParams.routes.http}/genres/${randomUUID()}`,
      method: 'DELETE',
      headers: { Authorization: accessToken },
      responseType: 'text',
    });

    assert.strictEqual(statusCode, HTTP_STATUS_CODES.NO_CONTENT);
    assert.strictEqual(responseBody, '');
  });
});
