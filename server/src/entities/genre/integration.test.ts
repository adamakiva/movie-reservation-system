/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import {
  after,
  assert,
  before,
  clearDatabase,
  CONSTANTS,
  generateGenresData,
  getAdminTokens,
  HTTP_STATUS_CODES,
  initServer,
  randomAlphaNumericString,
  randomUUID,
  seedGenre,
  seedGenres,
  sendHttpRequest,
  suite,
  terminateServer,
  test,
  type Genre,
  type ServerParams,
} from '../../tests/utils.ts';

/**********************************************************************************/

await suite('Genre integration tests', async () => {
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
    const createdGenres = await seedGenres(database, 32);

    try {
      const { statusCode, responseBody: fetchedGenres } = await sendHttpRequest<
        'GET',
        'json',
        Genre[]
      >({
        route: `${httpRoute}/genres`,
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
      await clearDatabase(database);
    }
  });
  await test('Valid - Read a lot', async () => {
    const { accessToken } = await getAdminTokens(httpRoute);
    const createdGenres = await seedGenres(database, 8_192);

    try {
      const { statusCode, responseBody: fetchedGenres } = await sendHttpRequest<
        'GET',
        'json',
        Genre[]
      >({
        route: `${httpRoute}/genres`,
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
      await clearDatabase(database);
    }
  });
  await test('Invalid - Create request with excess size', async () => {
    const { accessToken } = await getAdminTokens(httpRoute);

    const { statusCode } = await sendHttpRequest<'POST'>({
      route: `${httpRoute}/genres`,
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

    const genreData = generateGenresData()[0]!;

    try {
      const {
        statusCode,
        responseBody: { id, ...fields },
      } = await sendHttpRequest<'POST', 'json', Genre>({
        route: `${httpRoute}/genres`,
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
      await clearDatabase(database);
    }
  });
  await test('Invalid - Update request with excess size', async () => {
    const { accessToken } = await getAdminTokens(httpRoute);

    const { statusCode } = await sendHttpRequest<'PUT'>({
      route: `${httpRoute}/genres/${randomUUID()}`,
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
    const createdGenre = await seedGenre(database);

    const updatedGenreData = generateGenresData()[0]!;

    try {
      const { statusCode, responseBody: updatedGenre } = await sendHttpRequest<
        'PUT',
        'json',
        Genre
      >({
        route: `${httpRoute}/genres/${createdGenre.id}`,
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
      await clearDatabase(database);
    }
  });
  await test('Valid - Delete existent genre', async () => {
    let genreId = '';

    const { accessToken } = await getAdminTokens(httpRoute);

    const genreData = generateGenresData()[0]!;

    try {
      const createGenreResponse = await sendHttpRequest<'POST', 'json', Genre>({
        route: `${httpRoute}/genres`,
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
        route: `${httpRoute}/genres/${genreId}`,
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
  await test('Valid - Delete non-existent genre', async () => {
    const { accessToken } = await getAdminTokens(httpRoute);

    const { statusCode, responseBody } = await sendHttpRequest<
      'DELETE',
      'text',
      string
    >({
      route: `${httpRoute}/genres/${randomUUID()}`,
      method: 'DELETE',
      headers: { Authorization: accessToken },
      responseType: 'text',
    });

    assert.strictEqual(statusCode, HTTP_STATUS_CODES.NO_CONTENT);
    assert.strictEqual(responseBody, '');
  });
});
