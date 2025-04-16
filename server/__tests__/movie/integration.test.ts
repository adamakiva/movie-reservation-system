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
  type PaginatedResult,
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
      const {
        statusCode,
        responseBody: { movies: fetchedMovies, page },
      } = await sendHttpRequest<
        'GET',
        'json',
        PaginatedResult<{ movies: Movie[] }>
      >({
        route: `${serverParams.routes.http}/movies?${query}`,
        method: 'GET',
        headers: { Authorization: accessToken },
        responseType: 'json',
      });
      assert.strictEqual(statusCode, HTTP_STATUS_CODES.SUCCESS);
      assert.strictEqual(Array.isArray(fetchedMovies), true);

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

      assert.strictEqual(!!page, true);
      assert.strictEqual(page.hasNext, false);
      assert.strictEqual(page.cursor, null);
    } finally {
      await clearDatabase(serverParams.database);
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
        const {
          statusCode,
          responseBody: { movies: fetchedMovies, page },
        } = await sendHttpRequest<
          'GET',
          'json',
          PaginatedResult<{ movies: Movie[] }>
        >({
          route: `${serverParams.routes.http}/movies?${query}`,
          method: 'GET',
          headers: { Authorization: accessToken },
          responseType: 'json',
        });
        assert.strictEqual(statusCode, HTTP_STATUS_CODES.SUCCESS);
        assert.strictEqual(Array.isArray(fetchedMovies), true);

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

        assert.strictEqual(!!page, true);
        //@ts-expect-error null and 'null' (string) are interchangeable in this
        // context
        pagination = page;
      }
      /* eslint-enable no-await-in-loop */
      assert.strictEqual(createdMovies.length, 0);
    } finally {
      await clearDatabase(serverParams.database);
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
        const {
          statusCode,
          responseBody: { movies: fetchedMovies, page },
        } = await sendHttpRequest<
          'GET',
          'json',
          PaginatedResult<{ movies: Movie[] }>
        >({
          route: `${serverParams.routes.http}/movies?${query}`,
          method: 'GET',
          headers: { Authorization: accessToken },
          responseType: 'json',
        });
        assert.strictEqual(statusCode, HTTP_STATUS_CODES.SUCCESS);
        assert.strictEqual(Array.isArray(fetchedMovies), true);

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

        assert.strictEqual(!!page, true);
        //@ts-expect-error null and 'null' (string) are interchangeable in this
        // context
        pagination = page;
      }
      /* eslint-enable no-await-in-loop */
      assert.strictEqual(createdMovies.length, 0);
    } finally {
      await clearDatabase(serverParams.database);
    }
  });
  await test('Valid - Read movie poster', async () => {
    const { accessToken } = await getAdminTokens(serverParams);
    const { createdMovie, createdMoviePoster } = await seedMovie(serverParams);

    try {
      const { statusCode, responseBody } = await sendHttpRequest<
        'GET',
        'bytes',
        ReadableStream<Uint8Array>
      >({
        route: `${serverParams.routes.http}/movies/poster/${createdMovie.id}`,
        method: 'GET',
        headers: { Authorization: accessToken },
        responseType: 'bytes',
      });
      assert.strictEqual(statusCode, HTTP_STATUS_CODES.SUCCESS);

      await compareFiles(responseBody, createdMoviePoster.absolutePath);
    } finally {
      await clearDatabase(serverParams.database);
    }
  });
  await test('Invalid - Create request with excess size', async () => {
    const { accessToken } = await getAdminTokens(serverParams);

    const { statusCode } = await sendHttpRequest<'POST'>({
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
      responseType: 'bytes',
    });

    assert.strictEqual(statusCode, HTTP_STATUS_CODES.CONTENT_TOO_LARGE);
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

      const {
        statusCode,
        responseBody: { id, ...createdMovie },
      } = await sendHttpRequest<'POST', 'json', Movie>({
        route: `${serverParams.routes.http}/movies`,
        method: 'POST',
        headers: { Authorization: accessToken },
        payload: formData,
        responseType: 'json',
      });
      assert.strictEqual(statusCode, HTTP_STATUS_CODES.CREATED);

      const { genreId: _, ...expectedMovie } = movieData;

      assert.deepStrictEqual(createdMovie, {
        ...expectedMovie,
        genre: genreName,
      });
    } finally {
      await clearDatabase(serverParams.database);
    }
  });
  await test('Invalid - Update request with excess size', async () => {
    const { accessToken } = await getAdminTokens(serverParams);

    const { statusCode } = await sendHttpRequest<'PUT'>({
      route: `${serverParams.routes.http}/movies/${randomUUID()}`,
      method: 'PUT',
      headers: { Authorization: accessToken },
      payload: {
        firstName: randomAlphaNumericString(CONSTANTS.EIGHT_MEGABYTES),
      },
      responseType: 'bytes',
    });

    assert.strictEqual(statusCode, HTTP_STATUS_CODES.CONTENT_TOO_LARGE);
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

      const { statusCode, responseBody: updatedMovie } = await sendHttpRequest<
        'PUT',
        'json',
        Movie
      >({
        route: `${serverParams.routes.http}/movies/${createdMovie.id}`,
        method: 'PUT',
        headers: { Authorization: accessToken },
        payload: updatedMovieData,
        responseType: 'json',
      });
      assert.strictEqual(statusCode, HTTP_STATUS_CODES.SUCCESS);

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
      await clearDatabase(serverParams.database);
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

      const {
        statusCode,
        responseBody: { id },
      } = await sendHttpRequest<'POST', 'json', Movie>({
        route: `${serverParams.routes.http}/movies`,
        method: 'POST',
        headers: { Authorization: accessToken },
        payload: formData,
        responseType: 'json',
      });
      assert.strictEqual(statusCode, HTTP_STATUS_CODES.CREATED);
      movieId = id;

      const result = await sendHttpRequest<'DELETE', 'text', string>({
        route: `${serverParams.routes.http}/movies/${movieId}`,
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
  await test('Valid - Delete non-existent movie', async () => {
    const { accessToken } = await getAdminTokens(serverParams);

    const { statusCode, responseBody } = await sendHttpRequest<
      'DELETE',
      'text',
      string
    >({
      route: `${serverParams.routes.http}/movies/${randomUUID()}`,
      method: 'DELETE',
      headers: { Authorization: accessToken },
      responseType: 'text',
    });

    assert.strictEqual(statusCode, HTTP_STATUS_CODES.NO_CONTENT);
    assert.strictEqual(responseBody, '');
  });
});
