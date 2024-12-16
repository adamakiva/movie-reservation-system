import { seedGenre } from '../genre/utils.js';
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
  type ServerParams,
} from '../utils.js';

import {
  deleteMovies,
  generateMoviesData,
  seedMovie,
  seedMovies,
  type Movie,
} from './utils.js';

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

    await seedMovies(serverParams, 32, async (movies) => {
      const res = await sendHttpRequest({
        route: `${serverParams.routes.http}/movies?${new URLSearchParams({ pageSize: '64' })}`,
        method: 'GET',
        headers: { Authorization: accessToken },
      });
      assert.strictEqual(res.status, HTTP_STATUS_CODES.SUCCESS);

      const responseBody = await res.json();
      assert.strictEqual(Array.isArray(responseBody.movies), true);

      const fetchedMovies = responseBody.movies as Movie[];
      for (let i = movies.length - 1; i >= 0; --i) {
        const matchingMovieIndex = fetchedMovies.findIndex((u) => {
          return u.id === movies[i]!.id;
        });
        if (matchingMovieIndex !== -1) {
          assert.deepStrictEqual(movies[i], fetchedMovies[matchingMovieIndex]);
          movies.splice(i, 1);
        }
      }
      assert.strictEqual(movies.length, 0);

      assert.strictEqual(!!responseBody.page, true);
      assert.strictEqual(responseBody.page.hasNext, false);
      assert.strictEqual(responseBody.page.cursor, null);
    });
  });
  await test('Valid - Read many pages', async () => {
    const { accessToken } = await getAdminTokens(serverParams);

    await seedMovies(serverParams, 128, async (movies) => {
      let pagination = {
        hasNext: true,
        cursor: 'null',
      };

      /* eslint-disable no-await-in-loop */
      while (pagination.hasNext) {
        const res = await sendHttpRequest({
          route: `${serverParams.routes.http}/movies?${new URLSearchParams({ cursor: pagination.cursor, pageSize: '16' })}`,
          method: 'GET',
          headers: { Authorization: accessToken },
        });
        assert.strictEqual(res.status, HTTP_STATUS_CODES.SUCCESS);

        const responseBody = await res.json();
        assert.strictEqual(Array.isArray(responseBody.movies), true);

        const fetchedMovies = responseBody.movies as Movie[];
        for (let i = movies.length - 1; i >= 0; --i) {
          const matchingMovieIndex = fetchedMovies.findIndex((u) => {
            return u.id === movies[i]!.id;
          });
          if (matchingMovieIndex !== -1) {
            assert.deepStrictEqual(
              movies[i],
              fetchedMovies[matchingMovieIndex],
            );
            movies.splice(i, 1);
          }
        }

        assert.strictEqual(!!responseBody.page, true);
        pagination = responseBody.page;
      }
      /* eslint-enable no-await-in-loop */
      assert.strictEqual(movies.length, 0);
    });
  });
  await test('Valid - Read a lot pages', async () => {
    const { accessToken } = await getAdminTokens(serverParams);

    await seedMovies(serverParams, 8_192, async (movies) => {
      let pagination = {
        hasNext: true,
        cursor: 'null',
      };

      /* eslint-disable no-await-in-loop */
      while (pagination.hasNext) {
        const res = await sendHttpRequest({
          route: `${serverParams.routes.http}/movies?${new URLSearchParams({ cursor: pagination.cursor, pageSize: '16' })}`,
          method: 'GET',
          headers: { Authorization: accessToken },
        });
        assert.strictEqual(res.status, HTTP_STATUS_CODES.SUCCESS);

        const responseBody = await res.json();
        assert.strictEqual(Array.isArray(responseBody.movies), true);

        const fetchedMovies = responseBody.movies as Movie[];
        for (let i = movies.length - 1; i >= 0; --i) {
          const matchingMovieIndex = fetchedMovies.findIndex((u) => {
            return u.id === movies[i]!.id;
          });
          if (matchingMovieIndex !== -1) {
            assert.deepStrictEqual(
              movies[i],
              fetchedMovies[matchingMovieIndex],
            );
            movies.splice(i, 1);
          }
        }

        assert.strictEqual(!!responseBody.page, true);
        pagination = responseBody.page;
      }
      /* eslint-enable no-await-in-loop */
      assert.strictEqual(movies.length, 0);
    });
  });
  await test('Invalid - Create request with excess size', async () => {
    const { status } = await sendHttpRequest({
      route: `${serverParams.routes.http}/movies`,
      method: 'POST',
      payload: {
        firstName: 'a'.repeat(65_536),
        lastName: randomString(),
        email: `${randomString(8)}@ph.com`,
        password: '12345678',
        roleId: randomUUID(),
      },
    });

    assert.strictEqual(status, HTTP_STATUS_CODES.CONTENT_TOO_LARGE);
  });
  await test('Valid - Create', async () => {
    let movieId = '';
    const { accessToken } = await getAdminTokens(serverParams);
    await seedGenre(serverParams, async (genre) => {
      try {
        const movieData = {
          title: randomString(16),
          description: randomString(256),
          price: randomNumber(0, 99),
          genreId: genre.id,
        } as const;

        const res = await sendHttpRequest({
          route: `${serverParams.routes.http}/movies`,
          method: 'POST',
          headers: { Authorization: accessToken },
          payload: movieData,
        });
        assert.strictEqual(res.status, HTTP_STATUS_CODES.CREATED);

        const { id, ...createdMovie } = (await res.json()) as Movie;
        const { genreId: _, ...expectedMovie } = movieData;
        movieId = id;

        assert.deepStrictEqual(createdMovie, {
          ...expectedMovie,
          genre: genre.name,
        });
      } finally {
        await deleteMovies(serverParams, movieId);
      }
    });
  });
  await test('Invalid - Update request with excess size', async () => {
    const { status } = await sendHttpRequest({
      route: `${serverParams.routes.http}/movies/${randomUUID()}`,
      method: 'PUT',
      payload: { firstName: 'a'.repeat(65_536) },
    });

    assert.strictEqual(status, HTTP_STATUS_CODES.CONTENT_TOO_LARGE);
  });
  await test('Valid - Update', async () => {
    const { accessToken } = await getAdminTokens(serverParams);

    await seedMovie(serverParams, async (movie, genre) => {
      const updatedMovieData = {
        title: randomString(16),
        description: randomString(256),
        price: randomNumber(0, 99),
        genreId: genre.id,
      } as const;

      const res = await sendHttpRequest({
        route: `${serverParams.routes.http}/movies/${movie.id}`,
        method: 'PUT',
        headers: { Authorization: accessToken },
        payload: updatedMovieData,
      });
      assert.strictEqual(res.status, HTTP_STATUS_CODES.SUCCESS);

      const updatedMovie = await res.json();
      const { genreId, ...updatedMovieFields } = updatedMovieData;
      assert.deepStrictEqual(
        {
          ...movie,
          ...updatedMovieFields,
          genre: genre.name,
        },
        updatedMovie,
      );
    });
  });
  await test('Valid - Delete existent movie', async () => {
    let movieId = '';
    const { accessToken } = await getAdminTokens(serverParams);

    await seedGenre(serverParams, async (genre) => {
      try {
        let res = await sendHttpRequest({
          route: `${serverParams.routes.http}/movies`,
          method: 'POST',
          headers: { Authorization: accessToken },
          payload: generateMoviesData([genre.id], 1),
        });
        assert.strictEqual(res.status, HTTP_STATUS_CODES.CREATED);

        const { id } = (await res.json()) as Movie;
        movieId = id;

        res = await sendHttpRequest({
          route: `${serverParams.routes.http}/movies/${id}`,
          method: 'DELETE',
          headers: { Authorization: accessToken },
        });

        const responseBody = await res.text();

        assert.strictEqual(res.status, HTTP_STATUS_CODES.NO_CONTENT);
        assert.strictEqual(responseBody, '');
      } finally {
        await deleteMovies(serverParams, movieId);
      }
    });
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
