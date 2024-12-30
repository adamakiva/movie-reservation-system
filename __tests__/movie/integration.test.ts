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
  compareFiles,
  deleteGenres,
  deleteMovies,
  generateMovieDataIncludingPoster,
  generateMoviePostersData,
  readFile,
  seedGenre,
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
    const genreIds: string[] = [];
    const movieIds: string[] = [];

    // Not concurrent on purpose, allows for easier error handling and speed is
    // irrelevant for the tests. Reason being if the creation is finished before
    // the failure of the tokens fetch we will need to clean them up. This way
    // we don't have to
    const { accessToken } = await getAdminTokens(serverParams);
    const { createdGenres: genres, createdMovies: movies } = await seedMovies(
      serverParams,
      32,
    );
    genreIds.push(
      ...genres.map(({ id }) => {
        return id;
      }),
    );
    movieIds.push(
      ...movies.map(({ id }) => {
        return id;
      }),
    );

    try {
      const res = await sendHttpRequest({
        route: `${serverParams.routes.http}/movies?${new URLSearchParams({ 'page-size': '64' })}`,
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
    } finally {
      await deleteMovies(serverParams, ...movieIds);
      await deleteGenres(serverParams, ...genreIds);
    }
  });
  await test('Valid - Read many pages', async () => {
    const genreIds: string[] = [];
    const movieIds: string[] = [];

    // Not concurrent on purpose, allows for easier error handling and speed is
    // irrelevant for the tests. Reason being if the creation is finished before
    // the failure of the tokens fetch we will need to clean them up. This way
    // we don't have to
    const { accessToken } = await getAdminTokens(serverParams);
    const { createdMovies: movies, createdGenres: genres } = await seedMovies(
      serverParams,
      128,
    );
    genreIds.push(
      ...genres.map(({ id }) => {
        return id;
      }),
    );
    movieIds.push(
      ...movies.map(({ id }) => {
        return id;
      }),
    );

    let pagination = {
      hasNext: true,
      cursor: 'null',
    };

    try {
      /* eslint-disable no-await-in-loop */
      while (pagination.hasNext) {
        const res = await sendHttpRequest({
          route: `${serverParams.routes.http}/movies?${new URLSearchParams({ cursor: pagination.cursor, 'page-size': '16' })}`,
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
    } finally {
      await deleteMovies(serverParams, ...movieIds);
      await deleteGenres(serverParams, ...genreIds);
    }
  });
  await test('Valid - Read a lot pages', async () => {
    const genreIds: string[] = [];
    const movieIds: string[] = [];

    // Not concurrent on purpose, allows for easier error handling and speed is
    // irrelevant for the tests. Reason being if the creation is finished before
    // the failure of the tokens fetch we will need to clean them up. This way
    // we don't have to
    const { accessToken } = await getAdminTokens(serverParams);
    const { createdGenres: genres, createdMovies: movies } = await seedMovies(
      serverParams,
      8_192,
    );
    genreIds.push(
      ...genres.map(({ id }) => {
        return id;
      }),
    );
    movieIds.push(
      ...movies.map(({ id }) => {
        return id;
      }),
    );

    let pagination = {
      hasNext: true,
      cursor: 'null',
    };

    try {
      /* eslint-disable no-await-in-loop */
      while (pagination.hasNext) {
        const res = await sendHttpRequest({
          route: `${serverParams.routes.http}/movies?${new URLSearchParams({ cursor: pagination.cursor, 'page-size': '16' })}`,
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
    } finally {
      await deleteMovies(serverParams, ...movieIds);
      await deleteGenres(serverParams, ...genreIds);
    }
  });
  await test('Valid - Read movie poster', async () => {
    const genreIds: string[] = [];
    const movieIds: string[] = [];

    // Not concurrent on purpose, allows for easier error handling and speed is
    // irrelevant for the tests. Reason being if the creation is finished before
    // the failure of the tokens fetch we will need to clean them up. This way
    // we don't have to
    const { accessToken } = await getAdminTokens(serverParams);
    const { createdGenre, createdMovie, createdMoviePoster } =
      await seedMovie(serverParams);
    genreIds.push(createdGenre.id);
    movieIds.push(createdMovie.id);

    try {
      const res = await sendHttpRequest({
        route: `${serverParams.routes.http}/movies/poster/${createdMovie.id}`,
        method: 'GET',
        headers: { Authorization: accessToken },
      });
      assert.strictEqual(res.status, HTTP_STATUS_CODES.SUCCESS);

      await compareFiles(res, createdMoviePoster.path);
    } finally {
      await deleteMovies(serverParams, ...movieIds);
      await deleteGenres(serverParams, ...genreIds);
    }
  });
  await test('Invalid - Create request with excess size', async () => {
    const { status } = await sendHttpRequest({
      route: `${serverParams.routes.http}/movies`,
      method: 'POST',
      payload: {
        firstName: randomString(8_388_608),
        lastName: randomString(),
        email: `${randomString(8)}@ph.com`,
        password: '12345678',
        roleId: randomUUID(),
      },
    });

    assert.strictEqual(status, HTTP_STATUS_CODES.CONTENT_TOO_LARGE);
  });
  await test('Valid - Create', async () => {
    const genreIds: string[] = [];
    const movieIds: string[] = [];

    const { accessToken } = await getAdminTokens(serverParams);
    const genre = await seedGenre(serverParams);
    genreIds.push(genre.id);

    try {
      const { poster, ...movieData } = await generateMovieDataIncludingPoster(
        genre.id,
      );
      const file = new Blob([await readFile(poster.path)]);

      const formData = new FormData();
      Object.entries(movieData).forEach(([key, value]) => {
        formData.append(key, String(value));
      });
      formData.append('poster', file, `${randomString()}.jpg`);

      const res = await sendHttpRequest({
        route: `${serverParams.routes.http}/movies`,
        method: 'POST',
        headers: { Authorization: accessToken },
        payload: formData,
      });
      assert.strictEqual(res.status, HTTP_STATUS_CODES.CREATED);

      const { id, ...createdMovie } = (await res.json()) as Movie;
      const { genreId: _, ...expectedMovie } = movieData;
      movieIds.push(id);

      assert.deepStrictEqual(createdMovie, {
        ...expectedMovie,
        genre: genre.name,
      });
    } finally {
      await deleteMovies(serverParams, ...movieIds);
      await deleteGenres(serverParams, ...genreIds);
    }
  });
  await test('Invalid - Update request with excess size', async () => {
    const { status } = await sendHttpRequest({
      route: `${serverParams.routes.http}/movies/${randomUUID()}`,
      method: 'PUT',
      payload: { firstName: randomString(8_388_608) },
    });

    assert.strictEqual(status, HTTP_STATUS_CODES.CONTENT_TOO_LARGE);
  });
  await test('Valid - Update', async () => {
    const genreIds: string[] = [];
    const movieIds: string[] = [];

    // Not concurrent on purpose, allows for easier error handling and speed is
    // irrelevant for the tests. Reason being if the creation is finished before
    // the failure of the tokens fetch we will need to clean them up. This way
    // we don't have to
    const { accessToken } = await getAdminTokens(serverParams);
    const { createdGenre: genre, createdMovie: movie } =
      await seedMovie(serverParams);
    genreIds.push(genre.id);
    movieIds.push(movie.id);

    try {
      const updatedGenre = await seedGenre(serverParams);
      genreIds.push(updatedGenre.id);

      const updatedMovieData = {
        title: randomString(16),
        description: randomString(256),
        price: randomNumber(0, 99),
        genreId: updatedGenre.id,
      } as const;

      const poster = (await generateMoviePostersData())[0]!;
      const file = new Blob([await readFile(poster.path)]);

      const formData = new FormData();
      Object.entries(updatedMovieData).forEach(([key, value]) => {
        formData.append(key, String(value));
      });
      formData.append('poster', file, `${randomString()}.jpg`);

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
          genre: updatedGenre.name,
        },
        updatedMovie,
      );
    } finally {
      await deleteMovies(serverParams, ...movieIds);
      await deleteGenres(serverParams, ...genreIds);
    }
  });
  await test('Valid - Delete existent movie', async () => {
    const genreIds: string[] = [];
    const movieIds: string[] = [];

    // Not concurrent on purpose, allows for easier error handling and speed is
    // irrelevant for the tests. Reason being if the creation is finished before
    // the failure of the tokens fetch we will need to clean them up. This way
    // we don't have to
    const { accessToken } = await getAdminTokens(serverParams);
    const genre = await seedGenre(serverParams);
    genreIds.push(genre.id);

    try {
      const { poster, ...movieData } = await generateMovieDataIncludingPoster(
        genre.id,
      );
      const file = new Blob([await readFile(poster.path)]);
      const formData = new FormData();
      Object.entries(movieData).forEach(([key, value]) => {
        formData.append(key, String(value));
      });
      formData.append('poster', file, `${randomString()}.jpg`);

      let res = await sendHttpRequest({
        route: `${serverParams.routes.http}/movies`,
        method: 'POST',
        headers: { Authorization: accessToken },
        payload: formData,
      });
      assert.strictEqual(res.status, HTTP_STATUS_CODES.CREATED);

      const { id } = (await res.json()) as Movie;
      movieIds.push(id);

      res = await sendHttpRequest({
        route: `${serverParams.routes.http}/movies/${id}`,
        method: 'DELETE',
        headers: { Authorization: accessToken },
      });
      assert.strictEqual(res.status, HTTP_STATUS_CODES.NO_CONTENT);

      const responseBody = await res.text();
      assert.strictEqual(responseBody, '');
    } finally {
      await deleteMovies(serverParams, ...movieIds);
      await deleteGenres(serverParams, ...genreIds);
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
