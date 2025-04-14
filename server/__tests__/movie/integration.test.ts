/* eslint-disable @typescript-eslint/no-unsafe-member-access */
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
  randomNumber,
  randomUUID,
  sendHttpRequest,
  suite,
  terminateServer,
  test,
  type ServerParams,
} from '../utils.ts';

import {
  compareFiles,
  generateMovieDataIncludingPoster,
  generateMoviePostersData,
  generateMoviesData,
  MOVIE,
  readFile,
  seedGenre,
  seedMovie,
  seedMovies,
  USER,
  type Movie,
} from './utils.ts';

/**********************************************************************************/

const { SINGLE_PAGE, MULTIPLE_PAGES, LOT_OF_PAGES } = CONSTANTS;

/**********************************************************************************/

await suite('Movie integration tests', async () => {
  let serverParams: ServerParams = null!;
  before(async () => {
    serverParams = await initServer();
  });
  after(() => {
    terminateServer(serverParams);
  });

  await test('Valid - Read a single page', async () => {
    const { accessToken } = await getAdminTokens(serverParams);
    const { createdMovies } = await seedMovies(
      serverParams,
      SINGLE_PAGE.CREATE,
    );

    try {
      const query = new URLSearchParams({
        'page-size': String(SINGLE_PAGE.SIZE),
      });
      const res = await sendHttpRequest({
        route: `${serverParams.routes.http}/movies?${query}`,
        method: 'GET',
        headers: { Authorization: accessToken },
      });
      assert.strictEqual(res.status, HTTP_STATUS_CODES.SUCCESS);

      const responseBody = await res.json();
      assert.strictEqual(Array.isArray(responseBody.movies), true);

      const fetchedMovies = responseBody.movies as Movie[];
      for (let i = createdMovies.length - 1; i >= 0; --i) {
        const matchingMovieIndex = fetchedMovies.findIndex((u) => {
          return u.id === createdMovies[i]!.id;
        });
        if (matchingMovieIndex !== -1) {
          assert.deepStrictEqual(
            createdMovies[i],
            fetchedMovies[matchingMovieIndex],
          );
          createdMovies.splice(i, 1);
        }
      }
      assert.strictEqual(createdMovies.length, 0);

      assert.strictEqual(!!responseBody.page, true);
      assert.strictEqual(responseBody.page.hasNext, false);
      assert.strictEqual(responseBody.page.cursor, null);
    } finally {
      await clearDatabase(serverParams);
    }
  });
  await test('Valid - Read many pages', async () => {
    const { accessToken } = await getAdminTokens(serverParams);
    const { createdMovies } = await seedMovies(
      serverParams,
      MULTIPLE_PAGES.CREATE,
    );

    let pagination = {
      hasNext: true,
      cursor: 'null',
    };

    try {
      /* eslint-disable no-await-in-loop */
      while (pagination.hasNext) {
        const query = new URLSearchParams({
          cursor: pagination.cursor,
          'page-size': String(MULTIPLE_PAGES.SIZE),
        });
        const res = await sendHttpRequest({
          route: `${serverParams.routes.http}/movies?${query}`,
          method: 'GET',
          headers: { Authorization: accessToken },
        });
        assert.strictEqual(res.status, HTTP_STATUS_CODES.SUCCESS);

        const responseBody = await res.json();
        assert.strictEqual(Array.isArray(responseBody.movies), true);

        const fetchedMovies = responseBody.movies as Movie[];
        for (let i = createdMovies.length - 1; i >= 0; --i) {
          const matchingMovieIndex = fetchedMovies.findIndex((u) => {
            return u.id === createdMovies[i]!.id;
          });
          if (matchingMovieIndex !== -1) {
            assert.deepStrictEqual(
              createdMovies[i],
              fetchedMovies[matchingMovieIndex],
            );
            createdMovies.splice(i, 1);
          }
        }

        assert.strictEqual(!!responseBody.page, true);
        pagination = responseBody.page;
      }
      /* eslint-enable no-await-in-loop */
      assert.strictEqual(createdMovies.length, 0);
    } finally {
      await clearDatabase(serverParams);
    }
  });
  await test('Valid - Read a lot pages', async () => {
    const { accessToken } = await getAdminTokens(serverParams);
    const { createdMovies } = await seedMovies(
      serverParams,
      LOT_OF_PAGES.CREATE,
    );

    let pagination = {
      hasNext: true,
      cursor: 'null',
    };

    try {
      /* eslint-disable no-await-in-loop */
      while (pagination.hasNext) {
        const query = new URLSearchParams({
          cursor: pagination.cursor,
          'page-size': String(LOT_OF_PAGES.SIZE),
        });
        const res = await sendHttpRequest({
          route: `${serverParams.routes.http}/movies?${query}`,
          method: 'GET',
          headers: { Authorization: accessToken },
        });
        assert.strictEqual(res.status, HTTP_STATUS_CODES.SUCCESS);

        const responseBody = await res.json();
        assert.strictEqual(Array.isArray(responseBody.movies), true);

        const fetchedMovies = responseBody.movies as Movie[];
        for (let i = createdMovies.length - 1; i >= 0; --i) {
          const matchingMovieIndex = fetchedMovies.findIndex((u) => {
            return u.id === createdMovies[i]!.id;
          });
          if (matchingMovieIndex !== -1) {
            assert.deepStrictEqual(
              createdMovies[i],
              fetchedMovies[matchingMovieIndex],
            );
            createdMovies.splice(i, 1);
          }
        }

        assert.strictEqual(!!responseBody.page, true);
        pagination = responseBody.page;
      }
      /* eslint-enable no-await-in-loop */
      assert.strictEqual(createdMovies.length, 0);
    } finally {
      await clearDatabase(serverParams);
    }
  });
  await test('Valid - Read movie poster', async () => {
    const { accessToken } = await getAdminTokens(serverParams);
    const { createdMovie, createdMoviePoster } = await seedMovie(serverParams);

    try {
      const res = await sendHttpRequest({
        route: `${serverParams.routes.http}/movies/poster/${createdMovie.id}`,
        method: 'GET',
        headers: { Authorization: accessToken },
      });
      assert.strictEqual(res.status, HTTP_STATUS_CODES.SUCCESS);

      await compareFiles(res, createdMoviePoster.absolutePath);
    } finally {
      await clearDatabase(serverParams);
    }
  });
  await test('Invalid - Create request with excess size', async () => {
    const { accessToken } = await getAdminTokens(serverParams);

    const { status } = await sendHttpRequest({
      route: `${serverParams.routes.http}/movies`,
      method: 'POST',
      headers: { Authorization: accessToken },
      payload: {
        firstName: randomAlphaNumericString(CONSTANTS.EIGHT_MEGABYTES),
        lastName: randomAlphaNumericString(USER.LAST_NAME.MIN_LENGTH.VALUE + 1),
        email: `${randomAlphaNumericString(randomNumber(USER.EMAIL.MIN_LENGTH.VALUE + 1, USER.EMAIL.MAX_LENGTH.VALUE / 2))}@ph.com`,
        password: randomAlphaNumericString(USER.PASSWORD.MIN_LENGTH.VALUE + 1),
        roleId: randomUUID(),
      },
    });

    assert.strictEqual(status, HTTP_STATUS_CODES.CONTENT_TOO_LARGE);
  });
  await test('Valid - Create', async () => {
    const { accessToken } = await getAdminTokens(serverParams);
    const { id: genreId, name: genreName } = await seedGenre(serverParams);

    try {
      const { poster, ...movieData } =
        await generateMovieDataIncludingPoster(genreId);
      const file = new Blob([await readFile(poster.path)]);

      const formData = new FormData();
      Object.entries(movieData).forEach(([key, value]) => {
        formData.append(key, String(value));
      });
      formData.append(
        'poster',
        file,
        `${randomAlphaNumericString(MOVIE.POSTER.FILE_NAME.MIN_LENGTH.VALUE + 1)}.jpg`,
      );

      const res = await sendHttpRequest({
        route: `${serverParams.routes.http}/movies`,
        method: 'POST',
        headers: { Authorization: accessToken },
        payload: formData,
      });
      assert.strictEqual(res.status, HTTP_STATUS_CODES.CREATED);

      const { id, ...createdMovie } = (await res.json()) as Movie;
      const { genreId: _, ...expectedMovie } = movieData;

      assert.deepStrictEqual(createdMovie, {
        ...expectedMovie,
        genre: genreName,
      });
    } finally {
      await clearDatabase(serverParams);
    }
  });
  await test('Invalid - Update request with excess size', async () => {
    const { accessToken } = await getAdminTokens(serverParams);

    const { status } = await sendHttpRequest({
      route: `${serverParams.routes.http}/movies/${randomUUID()}`,
      method: 'PUT',
      headers: { Authorization: accessToken },
      payload: {
        firstName: randomAlphaNumericString(CONSTANTS.EIGHT_MEGABYTES),
      },
    });

    assert.strictEqual(status, HTTP_STATUS_CODES.CONTENT_TOO_LARGE);
  });
  await test('Valid - Update', async () => {
    const { accessToken } = await getAdminTokens(serverParams);
    const { createdMovie } = await seedMovie(serverParams);

    try {
      const newGenre = await seedGenre(serverParams);

      const updatedMovieData = {
        ...generateMoviesData()[0]!,
        genreId: newGenre.id,
      } as const;

      const poster = (await generateMoviePostersData())[0]!;
      const file = new Blob([await readFile(poster.absolutePath)]);

      const formData = new FormData();
      Object.entries(updatedMovieData).forEach(([key, value]) => {
        formData.append(key, String(value));
      });
      formData.append(
        'poster',
        file,
        `${randomAlphaNumericString(MOVIE.POSTER.FILE_NAME.MIN_LENGTH.VALUE + 1)}.jpg`,
      );

      const res = await sendHttpRequest({
        route: `${serverParams.routes.http}/movies/${createdMovie.id}`,
        method: 'PUT',
        headers: { Authorization: accessToken },
        payload: updatedMovieData,
      });
      assert.strictEqual(res.status, HTTP_STATUS_CODES.SUCCESS);

      const updatedMovie = await res.json();
      const { genreId, ...updatedMovieFields } = updatedMovieData;
      assert.deepStrictEqual(
        {
          ...createdMovie,
          ...updatedMovieFields,
          genre: newGenre.name,
        },
        updatedMovie,
      );
    } finally {
      await clearDatabase(serverParams);
    }
  });
  await test('Valid - Delete existent movie', async () => {
    let movieId = '';

    const { accessToken } = await getAdminTokens(serverParams);
    const { id: genreId } = await seedGenre(serverParams);

    try {
      const { poster, ...movieData } =
        await generateMovieDataIncludingPoster(genreId);
      const file = new Blob([await readFile(poster.path)]);
      const formData = new FormData();
      Object.entries(movieData).forEach(([key, value]) => {
        formData.append(key, String(value));
      });
      formData.append(
        'poster',
        file,
        `${randomAlphaNumericString(MOVIE.POSTER.FILE_NAME.MIN_LENGTH.VALUE - 1)}.jpg`,
      );

      let res = await sendHttpRequest({
        route: `${serverParams.routes.http}/movies`,
        method: 'POST',
        headers: { Authorization: accessToken },
        payload: formData,
      });
      assert.strictEqual(res.status, HTTP_STATUS_CODES.CREATED);

      ({ id: movieId } = (await res.json()) as Movie);

      res = await sendHttpRequest({
        route: `${serverParams.routes.http}/movies/${movieId}`,
        method: 'DELETE',
        headers: { Authorization: accessToken },
      });
      assert.strictEqual(res.status, HTTP_STATUS_CODES.NO_CONTENT);

      const responseBody = await res.text();
      assert.strictEqual(responseBody, '');
    } finally {
      await clearDatabase(serverParams);
    }
  });
  await test('Valid - Delete non-existent movie', async () => {
    const { accessToken } = await getAdminTokens(serverParams);

    const res = await sendHttpRequest({
      route: `${serverParams.routes.http}/movies/${randomUUID()}`,
      method: 'DELETE',
      headers: { Authorization: accessToken },
    });

    const responseBody = await res.text();

    assert.strictEqual(res.status, HTTP_STATUS_CODES.NO_CONTENT);
    assert.strictEqual(responseBody, '');
  });
});
