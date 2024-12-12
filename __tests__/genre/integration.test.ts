import {
  after,
  assert,
  before,
  getAdminTokens,
  HTTP_STATUS_CODES,
  initServer,
  randomString,
  randomUUID,
  sendHttpRequest,
  suite,
  terminateServer,
  test,
  type ServerParams,
} from '../utils.js';

import { deleteGenres, seedGenre, seedGenres, type Genre } from './utils.js';

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

    await seedGenres(serverParams, 32, async (genres) => {
      const res = await sendHttpRequest({
        route: `${serverParams.routes.http}/genres`,
        method: 'GET',
        headers: { Authorization: accessToken },
      });
      assert.strictEqual(res.status, HTTP_STATUS_CODES.SUCCESS);

      const fetchedGenres = (await res.json()) as Genre[];
      genres.forEach((genre) => {
        const matchingGenre = fetchedGenres.find((fetchedGenre) => {
          return fetchedGenre.id === genre.id;
        });

        assert.deepStrictEqual(genre, matchingGenre);
      });
    });
  });
  await test('Valid - Read a lot', async () => {
    const { accessToken } = await getAdminTokens(serverParams);

    await seedGenres(serverParams, 8_192, async (genres) => {
      const res = await sendHttpRequest({
        route: `${serverParams.routes.http}/genres`,
        method: 'GET',
        headers: { Authorization: accessToken },
      });
      assert.strictEqual(res.status, HTTP_STATUS_CODES.SUCCESS);

      const fetchedGenres = (await res.json()) as Genre[];
      genres.forEach((genre) => {
        const matchingGenre = fetchedGenres.find((fetchedGenre) => {
          return fetchedGenre.id === genre.id;
        });

        assert.deepStrictEqual(genre, matchingGenre);
      });
    });
  });
  await test('Invalid - Create request with excess size', async () => {
    const { status } = await sendHttpRequest({
      route: `${serverParams.routes.http}/genres`,
      method: 'POST',
      payload: { name: 'a'.repeat(65_536) },
    });

    assert.strictEqual(status, HTTP_STATUS_CODES.CONTENT_TOO_LARGE);
  });
  await test('Valid - Create', async () => {
    let genreId = '';

    try {
      const { accessToken } = await getAdminTokens(serverParams);

      const genreData = { name: randomString(16) } as const;

      const res = await sendHttpRequest({
        route: `${serverParams.routes.http}/genres`,
        method: 'POST',
        headers: { Authorization: accessToken },
        payload: genreData,
      });
      assert.strictEqual(res.status, HTTP_STATUS_CODES.CREATED);

      const { id, ...fields } = (await res.json()) as Genre;
      genreId = id;
      assert.strictEqual(typeof id === 'string', true);
      assert.deepStrictEqual(
        { ...genreData, name: genreData.name.toLowerCase() },
        fields,
      );
    } finally {
      await deleteGenres(serverParams, genreId);
    }
  });
  await test('Invalid - Update request with excess size', async () => {
    const { status } = await sendHttpRequest({
      route: `${serverParams.routes.http}/genres/${randomUUID()}`,
      method: 'PUT',
      payload: { name: 'a'.repeat(65_536) },
    });

    assert.strictEqual(status, HTTP_STATUS_CODES.CONTENT_TOO_LARGE);
  });
  await test('Valid - Update', async () => {
    const { accessToken } = await getAdminTokens(serverParams);

    await seedGenre(serverParams, async (genre) => {
      const updatedGenreData = { name: randomString(16) } as const;

      const res = await sendHttpRequest({
        route: `${serverParams.routes.http}/genres/${genre.id}`,
        method: 'PUT',
        headers: { Authorization: accessToken },
        payload: updatedGenreData,
      });
      assert.strictEqual(res.status, HTTP_STATUS_CODES.SUCCESS);

      const updatedGenre = await res.json();
      assert.deepStrictEqual(
        {
          ...genre,
          ...{
            ...updatedGenreData,
            name: updatedGenreData.name.toLowerCase(),
          },
        },
        updatedGenre,
      );
    });
  });
  await test('Valid - Delete existent genre', async () => {
    let genreId = '';

    try {
      const { accessToken } = await getAdminTokens(serverParams);

      const genreData = { name: randomString() } as const;

      let res = await sendHttpRequest({
        route: `${serverParams.routes.http}/genres`,
        method: 'POST',
        headers: { Authorization: accessToken },
        payload: genreData,
      });
      assert.strictEqual(res.status, HTTP_STATUS_CODES.CREATED);

      const { id } = (await res.json()) as Genre;
      genreId = id;

      res = await sendHttpRequest({
        route: `${serverParams.routes.http}/genres/${id}`,
        method: 'DELETE',
        headers: { Authorization: accessToken },
      });

      const responseBody = await res.text();

      assert.strictEqual(res.status, HTTP_STATUS_CODES.NO_CONTENT);
      assert.strictEqual(responseBody, '');
    } finally {
      await deleteGenres(serverParams, genreId);
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
