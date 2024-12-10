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

import {
  createGenre,
  createGenres,
  deleteGenres,
  generateGenresData,
  type Genre,
} from './utils.js';

/**********************************************************************************/

await suite('Genre integration tests', async () => {
  let serverParams: ServerParams = null!;
  before(async () => {
    serverParams = await initServer();
  });
  after(() => {
    terminateServer(serverParams);
  });

  await test('Read', async () => {
    await createGenres(
      serverParams,
      generateGenresData(32),
      async ({ accessToken }, genres) => {
        const res = await sendHttpRequest({
          route: `${serverParams.routes.base}/genres`,
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
      },
    );
  });
  await suite('Create', async () => {
    await test('Body too large', async () => {
      const { status } = await sendHttpRequest({
        route: `${serverParams.routes.base}/genres`,
        method: 'POST',
        payload: { name: 'a'.repeat(65_536) },
      });

      assert.strictEqual(status, HTTP_STATUS_CODES.CONTENT_TOO_LARGE);
    });
    await test('Valid', async () => {
      let genreId = '';

      try {
        const { accessToken } = await getAdminTokens(serverParams);

        const genreData = { name: randomString(16) } as const;

        const res = await sendHttpRequest({
          route: `${serverParams.routes.base}/genres`,
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
  });
  await suite('Update', async () => {
    await test('Body too large', async () => {
      const { status } = await sendHttpRequest({
        route: `${serverParams.routes.base}/genres/${randomUUID()}`,
        method: 'PUT',
        payload: { name: 'a'.repeat(65_536) },
      });

      assert.strictEqual(status, HTTP_STATUS_CODES.CONTENT_TOO_LARGE);
    });
    await test('Valid', async () => {
      await createGenre(
        serverParams,
        generateGenresData(),
        async ({ accessToken }, genre) => {
          const updatedGenreData = { name: randomString(16) } as const;

          const res = await sendHttpRequest({
            route: `${serverParams.routes.base}/genres/${genre.id}`,
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
        },
      );
    });
  });
  await suite('Delete', async () => {
    await test('Existent', async () => {
      let genreId = '';

      try {
        const { accessToken } = await getAdminTokens(serverParams);

        const genreData = { name: randomString() } as const;

        let res = await sendHttpRequest({
          route: `${serverParams.routes.base}/genres`,
          method: 'POST',
          headers: { Authorization: accessToken },
          payload: genreData,
        });
        assert.strictEqual(res.status, HTTP_STATUS_CODES.CREATED);

        const { id } = (await res.json()) as Genre;
        genreId = id;

        res = await sendHttpRequest({
          route: `${serverParams.routes.base}/genres/${id}`,
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
    await test('Non-existent', async () => {
      const { accessToken } = await getAdminTokens(serverParams);

      const res = await sendHttpRequest({
        route: `${serverParams.routes.base}/genres/${randomUUID()}`,
        method: 'DELETE',
        headers: { Authorization: accessToken },
      });

      const responseBody = await res.text();

      assert.strictEqual(res.status, HTTP_STATUS_CODES.NO_CONTENT);
      assert.strictEqual(responseBody, '');
    });
  });
});
