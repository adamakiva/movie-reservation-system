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
  VALIDATION,
  type ServerParams,
} from '../utils.js';

import { deleteGenres, seedGenre, seedGenres, type Genre } from './utils.js';

const { GENRE } = VALIDATION;

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
    const genreIds: string[] = [];
    // Not concurrent on purpose, allows for easier error handling and speed is
    // irrelevant for the tests. Reason being if the creation is finished before
    // the failure of the tokens fetch we will need to clean them up. This way
    // we don't have to
    const { accessToken } = await getAdminTokens(serverParams);
    const genres = await seedGenres(serverParams, 32);
    genreIds.push(
      ...genres.map(({ id }) => {
        return id;
      }),
    );

    try {
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
    } finally {
      await deleteGenres(serverParams, ...genreIds);
    }
  });
  await test('Valid - Read a lot', async () => {
    const genreIds: string[] = [];
    // Not concurrent on purpose, allows for easier error handling and speed is
    // irrelevant for the tests. Reason being if the creation is finished before
    // the failure of the tokens fetch we will need to clean them up. This way
    // we don't have to
    const { accessToken } = await getAdminTokens(serverParams);
    const genres = await seedGenres(serverParams, 8_192);
    genreIds.push(
      ...genres.map(({ id }) => {
        return id;
      }),
    );

    try {
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
    } finally {
      await deleteGenres(serverParams, ...genreIds);
    }
  });
  await test('Invalid - Create request with excess size', async () => {
    const { status } = await sendHttpRequest({
      route: `${serverParams.routes.http}/genres`,
      method: 'POST',
      payload: { name: randomString(1_000_000) },
    });

    assert.strictEqual(status, HTTP_STATUS_CODES.CONTENT_TOO_LARGE);
  });
  await test('Valid - Create', async () => {
    const genreIds: string[] = [];

    const { accessToken } = await getAdminTokens(serverParams);

    const genreData = {
      name: randomString(GENRE.NAME.MAX_LENGTH.VALUE - 1),
    } as const;

    try {
      const res = await sendHttpRequest({
        route: `${serverParams.routes.http}/genres`,
        method: 'POST',
        headers: { Authorization: accessToken },
        payload: genreData,
      });
      assert.strictEqual(res.status, HTTP_STATUS_CODES.CREATED);

      const { id, ...fields } = (await res.json()) as Genre;
      genreIds.push(id);
      assert.strictEqual(typeof id === 'string', true);
      assert.deepStrictEqual(
        { ...genreData, name: genreData.name.toLowerCase() },
        fields,
      );
    } finally {
      await deleteGenres(serverParams, ...genreIds);
    }
  });
  await test('Invalid - Update request with excess size', async () => {
    const { status } = await sendHttpRequest({
      route: `${serverParams.routes.http}/genres/${randomUUID()}`,
      method: 'PUT',
      payload: { name: randomString(1_000_000) },
    });

    assert.strictEqual(status, HTTP_STATUS_CODES.CONTENT_TOO_LARGE);
  });
  await test('Valid - Update', async () => {
    const genreIds: string[] = [];

    // Not concurrent on purpose, allows for easier error handling and speed is
    // irrelevant for the tests. Reason being if the creation is finished before
    // the failure of the tokens fetch we will need to clean them up. This way
    // we don't have to
    const { accessToken } = await getAdminTokens(serverParams);
    const genre = await seedGenre(serverParams);
    genreIds.push(genre.id);

    const updatedGenreData = {
      name: randomString(GENRE.NAME.MAX_LENGTH.VALUE - 1),
    } as const;

    try {
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
    } finally {
      await deleteGenres(serverParams, ...genreIds);
    }
  });
  await test('Valid - Delete existent genre', async () => {
    const genreIds: string[] = [];

    const { accessToken } = await getAdminTokens(serverParams);

    const genreData = {
      name: randomString(GENRE.NAME.MAX_LENGTH.VALUE - 1),
    } as const;

    try {
      let res = await sendHttpRequest({
        route: `${serverParams.routes.http}/genres`,
        method: 'POST',
        headers: { Authorization: accessToken },
        payload: genreData,
      });
      assert.strictEqual(res.status, HTTP_STATUS_CODES.CREATED);

      const { id } = (await res.json()) as Genre;
      genreIds.push(id);

      res = await sendHttpRequest({
        route: `${serverParams.routes.http}/genres/${id}`,
        method: 'DELETE',
        headers: { Authorization: accessToken },
      });

      const responseBody = await res.text();

      assert.strictEqual(res.status, HTTP_STATUS_CODES.NO_CONTENT);
      assert.strictEqual(responseBody, '');
    } finally {
      await deleteGenres(serverParams, ...genreIds);
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
