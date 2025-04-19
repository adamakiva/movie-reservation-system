/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import {
  after,
  assert,
  before,
  clearDatabase,
  CONSTANTS,
  generateShowtimesData,
  getAdminTokens,
  HTTP_STATUS_CODES,
  initServer,
  randomAlphaNumericString,
  randomUUID,
  seedHall,
  seedMovie,
  seedShowtimes,
  sendHttpRequest,
  SHOWTIME,
  suite,
  terminateServer,
  test,
  type PaginatedResult,
  type ServerParams,
  type Showtime,
} from '../../tests/utils.ts';

/**********************************************************************************/

const { SINGLE_PAGE, MULTIPLE_PAGES, LOT_OF_PAGES } = CONSTANTS;

function compareShowtimes(params: {
  movies: Awaited<ReturnType<typeof seedShowtimes>>['createdMovies'];
  halls: Awaited<ReturnType<typeof seedShowtimes>>['createdHalls'];
  created: Awaited<
    ReturnType<typeof seedShowtimes>
  >['createdShowtimes'][number];
  fetched: Showtime;
}) {
  const { movies, halls, created, fetched } = params;

  const { movieId, hallId, ...createdShowtime } = created;
  const { at, movieTitle, hallName, ...fetchedShowtime } = fetched;

  assert(
    movies.find((movie) => {
      return movie.id === movieId;
    })?.title,
    movieTitle,
  );
  assert(
    halls.find((hall) => {
      return hall.id === hallId;
    })?.name,
    hallName,
  );
  assert.deepStrictEqual(
    { ...createdShowtime, reservations: [] },
    {
      ...fetchedShowtime,
      at: new Date(at),
    },
  );
}

/**********************************************************************************/

await suite('Showtime integration tests', async () => {
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
    await terminateServer(server, database);
  });

  await test('Valid - Read a single page without filters', async () => {
    const { accessToken } = await getAdminTokens(httpRoute);
    const { createdMovies, createdHalls, createdShowtimes } =
      await seedShowtimes(database, SINGLE_PAGE.CREATE);

    try {
      const query = new URLSearchParams({
        'page-size': String(SINGLE_PAGE.SIZE),
      });
      const {
        statusCode,
        responseBody: { showtimes: fetchedShowtimes, page },
      } = await sendHttpRequest<
        'GET',
        'json',
        PaginatedResult<{ showtimes: Showtime[] }>
      >({
        route: `${httpRoute}/showtimes?${query}`,
        method: 'GET',
        headers: { Authorization: accessToken },
        responseType: 'json',
      });
      assert.strictEqual(statusCode, HTTP_STATUS_CODES.SUCCESS);
      assert.strictEqual(Array.isArray(fetchedShowtimes), true);

      for (let i = createdShowtimes.length - 1; i >= 0; --i) {
        const matchingShowtimeIndex = fetchedShowtimes.findIndex((u) => {
          return u.id === createdShowtimes[i]!.id;
        });
        if (matchingShowtimeIndex !== -1) {
          compareShowtimes({
            movies: createdMovies,
            halls: createdHalls,
            created: createdShowtimes[i]!,
            fetched: fetchedShowtimes[matchingShowtimeIndex]!,
          });

          createdShowtimes.splice(i, 1);
        }
      }
      assert.strictEqual(createdShowtimes.length, 0);

      assert.strictEqual(!!page, true);
      assert.strictEqual(page.hasNext, false);
      assert.strictEqual(page.cursor, null);
    } finally {
      await clearDatabase(database);
    }
  });
  await test('Valid - Read many pages without filters', async () => {
    const { accessToken } = await getAdminTokens(httpRoute);
    const { createdMovies, createdHalls, createdShowtimes } =
      await seedShowtimes(database, MULTIPLE_PAGES.CREATE);

    try {
      let pagination = {
        hasNext: true,
        cursor: 'null',
      };

      /* eslint-disable no-await-in-loop */
      while (pagination.hasNext) {
        const query = new URLSearchParams({
          cursor: pagination.cursor,
          'page-size': String(MULTIPLE_PAGES.SIZE),
        });
        const {
          statusCode,
          responseBody: { showtimes: fetchedShowtimes, page },
        } = await sendHttpRequest<
          'GET',
          'json',
          PaginatedResult<{ showtimes: Showtime[] }>
        >({
          route: `${httpRoute}/showtimes?${query}`,
          method: 'GET',
          headers: { Authorization: accessToken },
          responseType: 'json',
        });
        assert.strictEqual(statusCode, HTTP_STATUS_CODES.SUCCESS);
        assert.strictEqual(Array.isArray(fetchedShowtimes), true);

        for (let i = createdShowtimes.length - 1; i >= 0; --i) {
          const matchingShowtimeIndex = fetchedShowtimes.findIndex((u) => {
            return u.id === createdShowtimes[i]!.id;
          });
          if (matchingShowtimeIndex !== -1) {
            compareShowtimes({
              movies: createdMovies,
              halls: createdHalls,
              created: createdShowtimes[i]!,
              fetched: fetchedShowtimes[matchingShowtimeIndex]!,
            });

            createdShowtimes.splice(i, 1);
          }
        }

        assert.strictEqual(!!page, true);
        //@ts-expect-error null and 'null' (string) are interchangeable in this
        // context
        pagination = page;
      }
      /* eslint-enable no-await-in-loop */
      assert.strictEqual(createdShowtimes.length, 0);
    } finally {
      await clearDatabase(database);
    }
  });
  await test('Valid - Read a lot pages without filters', async () => {
    const { accessToken } = await getAdminTokens(httpRoute);
    const { createdMovies, createdHalls, createdShowtimes } =
      await seedShowtimes(database, LOT_OF_PAGES.CREATE);

    try {
      let pagination = {
        hasNext: true,
        cursor: 'null',
      };

      /* eslint-disable no-await-in-loop */
      while (pagination.hasNext) {
        const query = new URLSearchParams({
          cursor: pagination.cursor,
          'page-size': String(LOT_OF_PAGES.SIZE),
        });
        const {
          statusCode,
          responseBody: { showtimes: fetchedShowtimes, page },
        } = await sendHttpRequest<
          'GET',
          'json',
          PaginatedResult<{ showtimes: Showtime[] }>
        >({
          route: `${httpRoute}/showtimes?${query}`,
          method: 'GET',
          headers: { Authorization: accessToken },
          responseType: 'json',
        });
        assert.strictEqual(statusCode, HTTP_STATUS_CODES.SUCCESS);
        assert.strictEqual(Array.isArray(fetchedShowtimes), true);

        for (let i = createdShowtimes.length - 1; i >= 0; --i) {
          const matchingShowtimeIndex = fetchedShowtimes.findIndex((u) => {
            return u.id === createdShowtimes[i]!.id;
          });
          if (matchingShowtimeIndex !== -1) {
            compareShowtimes({
              movies: createdMovies,
              halls: createdHalls,
              created: createdShowtimes[i]!,
              fetched: fetchedShowtimes[matchingShowtimeIndex]!,
            });

            createdShowtimes.splice(i, 1);
          }
        }

        assert.strictEqual(!!page, true);
        //@ts-expect-error null and 'null' (string) are interchangeable in this
        // context
        pagination = page;
      }
      /* eslint-enable no-await-in-loop */
      assert.strictEqual(createdShowtimes.length, 0);
    } finally {
      await clearDatabase(database);
    }
  });
  await test('Valid - Read a single page with movie filter', async () => {
    const { accessToken } = await getAdminTokens(httpRoute);
    const { createdMovies, createdHalls, createdShowtimes } =
      await seedShowtimes(database, SINGLE_PAGE.CREATE, SINGLE_PAGE.CREATE / 2);
    const movieIdToFilterBy = createdMovies[0]!.id;

    try {
      const query = new URLSearchParams({
        'movie-id': movieIdToFilterBy,
        'page-size': String(SINGLE_PAGE.SIZE),
      });
      const {
        statusCode,
        responseBody: { showtimes: fetchedShowtimes, page },
      } = await sendHttpRequest<
        'GET',
        'json',
        PaginatedResult<{ showtimes: Showtime[] }>
      >({
        route: `${httpRoute}/showtimes?${query}`,
        method: 'GET',
        headers: { Authorization: accessToken },
        responseType: 'json',
      });
      assert.strictEqual(statusCode, HTTP_STATUS_CODES.SUCCESS);
      assert.strictEqual(Array.isArray(fetchedShowtimes), true);

      for (let i = createdShowtimes.length - 1; i >= 0; --i) {
        const matchingShowtimeIndex = fetchedShowtimes.findIndex((u) => {
          return u.id === createdShowtimes[i]!.id;
        });
        if (matchingShowtimeIndex !== -1) {
          compareShowtimes({
            movies: createdMovies,
            halls: createdHalls,
            created: createdShowtimes[i]!,
            fetched: fetchedShowtimes[matchingShowtimeIndex]!,
          });

          createdShowtimes.splice(i, 1);
        }
      }
      const removedAllRelevantShowtimes = !createdShowtimes.filter(
        (createdShowtime) => {
          return createdShowtime.movieId === movieIdToFilterBy;
        },
      ).length;
      assert.strictEqual(removedAllRelevantShowtimes, true);

      assert.strictEqual(!!page, true);
      assert.strictEqual(page.hasNext, false);
      assert.strictEqual(page.cursor, null);
    } finally {
      await clearDatabase(database);
    }
  });
  await test('Valid - Read many pages with movie filter', async () => {
    const { accessToken } = await getAdminTokens(httpRoute);
    const { createdMovies, createdHalls, createdShowtimes } =
      await seedShowtimes(
        database,
        MULTIPLE_PAGES.CREATE,
        MULTIPLE_PAGES.CREATE / 2,
      );
    const movieIdToFilterBy = createdMovies[0]!.id;

    try {
      let pagination = {
        hasNext: true,
        cursor: 'null',
      };

      /* eslint-disable no-await-in-loop */
      while (pagination.hasNext) {
        const query = new URLSearchParams({
          'movie-id': movieIdToFilterBy,
          cursor: pagination.cursor,
          'page-size': String(MULTIPLE_PAGES.SIZE),
        });
        const {
          statusCode,
          responseBody: { showtimes: fetchedShowtimes, page },
        } = await sendHttpRequest<
          'GET',
          'json',
          PaginatedResult<{ showtimes: Showtime[] }>
        >({
          route: `${httpRoute}/showtimes?${query}`,
          method: 'GET',
          headers: { Authorization: accessToken },
          responseType: 'json',
        });
        assert.strictEqual(statusCode, HTTP_STATUS_CODES.SUCCESS);
        assert.strictEqual(Array.isArray(fetchedShowtimes), true);

        for (let i = createdShowtimes.length - 1; i >= 0; --i) {
          const matchingShowtimeIndex = fetchedShowtimes.findIndex((u) => {
            return u.id === createdShowtimes[i]!.id;
          });
          if (matchingShowtimeIndex !== -1) {
            compareShowtimes({
              movies: createdMovies,
              halls: createdHalls,
              created: createdShowtimes[i]!,
              fetched: fetchedShowtimes[matchingShowtimeIndex]!,
            });

            createdShowtimes.splice(i, 1);
          }
        }

        assert.strictEqual(!!page, true);
        //@ts-expect-error null and 'null' (string) are interchangeable in this
        // context
        pagination = page;
      }
      /* eslint-enable no-await-in-loop */
      const removedAllRelevantShowtimes = !createdShowtimes.filter(
        (createdShowtime) => {
          return createdShowtime.movieId === movieIdToFilterBy;
        },
      ).length;
      assert.strictEqual(removedAllRelevantShowtimes, true);
    } finally {
      await clearDatabase(database);
    }
  });
  await test('Valid - Read a lot pages with movie filter', async () => {
    const { accessToken } = await getAdminTokens(httpRoute);
    const { createdMovies, createdHalls, createdShowtimes } =
      await seedShowtimes(
        database,
        LOT_OF_PAGES.CREATE,
        LOT_OF_PAGES.CREATE / 2,
      );
    const movieIdToFilterBy = createdMovies[0]!.id;

    try {
      let pagination = {
        hasNext: true,
        cursor: 'null',
      };

      /* eslint-disable no-await-in-loop */
      while (pagination.hasNext) {
        const query = new URLSearchParams({
          'movie-id': movieIdToFilterBy,
          cursor: pagination.cursor,
          'page-size': String(LOT_OF_PAGES.SIZE),
        });
        const {
          statusCode,
          responseBody: { showtimes: fetchedShowtimes, page },
        } = await sendHttpRequest<
          'GET',
          'json',
          PaginatedResult<{ showtimes: Showtime[] }>
        >({
          route: `${httpRoute}/showtimes?${query}`,
          method: 'GET',
          headers: { Authorization: accessToken },
          responseType: 'json',
        });
        assert.strictEqual(statusCode, HTTP_STATUS_CODES.SUCCESS);
        assert.strictEqual(Array.isArray(fetchedShowtimes), true);

        for (let i = createdShowtimes.length - 1; i >= 0; --i) {
          const matchingShowtimeIndex = fetchedShowtimes.findIndex((u) => {
            return u.id === createdShowtimes[i]!.id;
          });
          if (matchingShowtimeIndex !== -1) {
            compareShowtimes({
              movies: createdMovies,
              halls: createdHalls,
              created: createdShowtimes[i]!,
              fetched: fetchedShowtimes[matchingShowtimeIndex]!,
            });

            createdShowtimes.splice(i, 1);
          }
        }

        assert.strictEqual(!!page, true);
        //@ts-expect-error null and 'null' (string) are interchangeable in this
        // context
        pagination = page;
      }
      /* eslint-enable no-await-in-loop */
      const removedAllRelevantShowtimes = !createdShowtimes.filter(
        (createdShowtime) => {
          return createdShowtime.movieId === movieIdToFilterBy;
        },
      ).length;
      assert.strictEqual(removedAllRelevantShowtimes, true);
    } finally {
      await clearDatabase(database);
    }
  });
  await test('Valid - Read a single page with hall filter', async () => {
    const { accessToken } = await getAdminTokens(httpRoute);
    const { createdMovies, createdHalls, createdShowtimes } =
      await seedShowtimes(database, SINGLE_PAGE.CREATE, SINGLE_PAGE.CREATE / 2);
    const hallIdToFilterBy = createdHalls[0]!.id;

    try {
      const query = new URLSearchParams({
        'hall-id': hallIdToFilterBy,
        'page-size': String(SINGLE_PAGE.SIZE),
      });
      const {
        statusCode,
        responseBody: { showtimes: fetchedShowtimes, page },
      } = await sendHttpRequest<
        'GET',
        'json',
        PaginatedResult<{ showtimes: Showtime[] }>
      >({
        route: `${httpRoute}/showtimes?${query}`,
        method: 'GET',
        headers: { Authorization: accessToken },
        responseType: 'json',
      });
      assert.strictEqual(statusCode, HTTP_STATUS_CODES.SUCCESS);
      assert.strictEqual(Array.isArray(fetchedShowtimes), true);

      for (let i = createdShowtimes.length - 1; i >= 0; --i) {
        const matchingShowtimeIndex = fetchedShowtimes.findIndex((u) => {
          return u.id === createdShowtimes[i]!.id;
        });
        if (matchingShowtimeIndex !== -1) {
          compareShowtimes({
            movies: createdMovies,
            halls: createdHalls,
            created: createdShowtimes[i]!,
            fetched: fetchedShowtimes[matchingShowtimeIndex]!,
          });

          createdShowtimes.splice(i, 1);
        }
      }
      const removedAllRelevantShowtimes = !createdShowtimes.filter(
        (createdShowtime) => {
          return createdShowtime.hallId === hallIdToFilterBy;
        },
      ).length;
      assert.strictEqual(removedAllRelevantShowtimes, true);

      assert.strictEqual(!!page, true);
      assert.strictEqual(page.hasNext, false);
      assert.strictEqual(page.cursor, null);
    } finally {
      await clearDatabase(database);
    }
  });
  await test('Valid - Read many pages with hall filter', async () => {
    const { accessToken } = await getAdminTokens(httpRoute);
    const { createdMovies, createdHalls, createdShowtimes } =
      await seedShowtimes(
        database,
        MULTIPLE_PAGES.CREATE,
        MULTIPLE_PAGES.CREATE / 2,
      );
    const hallIdToFilterBy = createdHalls[0]!.id;

    try {
      let pagination = {
        hasNext: true,
        cursor: 'null',
      };

      /* eslint-disable no-await-in-loop */
      while (pagination.hasNext) {
        const query = new URLSearchParams({
          'hall-id': hallIdToFilterBy,
          cursor: pagination.cursor,
          'page-size': String(MULTIPLE_PAGES.SIZE),
        });
        const {
          statusCode,
          responseBody: { showtimes: fetchedShowtimes, page },
        } = await sendHttpRequest<
          'GET',
          'json',
          PaginatedResult<{ showtimes: Showtime[] }>
        >({
          route: `${httpRoute}/showtimes?${query}`,
          method: 'GET',
          headers: { Authorization: accessToken },
          responseType: 'json',
        });
        assert.strictEqual(statusCode, HTTP_STATUS_CODES.SUCCESS);
        assert.strictEqual(Array.isArray(fetchedShowtimes), true);

        for (let i = createdShowtimes.length - 1; i >= 0; --i) {
          const matchingShowtimeIndex = fetchedShowtimes.findIndex((u) => {
            return u.id === createdShowtimes[i]!.id;
          });
          if (matchingShowtimeIndex !== -1) {
            compareShowtimes({
              movies: createdMovies,
              halls: createdHalls,
              created: createdShowtimes[i]!,
              fetched: fetchedShowtimes[matchingShowtimeIndex]!,
            });

            createdShowtimes.splice(i, 1);
          }
        }

        assert.strictEqual(!!page, true);
        //@ts-expect-error null and 'null' (string) are interchangeable in this
        // context
        pagination = page;
      }
      /* eslint-enable no-await-in-loop */
      const removedAllRelevantShowtimes = !createdShowtimes.filter(
        (createdShowtime) => {
          return createdShowtime.hallId === hallIdToFilterBy;
        },
      ).length;
      assert.strictEqual(removedAllRelevantShowtimes, true);
    } finally {
      await clearDatabase(database);
    }
  });
  await test('Valid - Read a lot pages with hall filter', async () => {
    const { accessToken } = await getAdminTokens(httpRoute);
    const { createdMovies, createdHalls, createdShowtimes } =
      await seedShowtimes(
        database,
        LOT_OF_PAGES.CREATE,
        LOT_OF_PAGES.CREATE / 2,
      );
    const hallIdToFilterBy = createdHalls[0]!.id;

    try {
      let pagination = {
        hasNext: true,
        cursor: 'null',
      };

      /* eslint-disable no-await-in-loop */
      while (pagination.hasNext) {
        const query = new URLSearchParams({
          'hall-id': hallIdToFilterBy,
          cursor: pagination.cursor,
          'page-size': String(LOT_OF_PAGES.SIZE),
        });
        const {
          statusCode,
          responseBody: { showtimes: fetchedShowtimes, page },
        } = await sendHttpRequest<
          'GET',
          'json',
          PaginatedResult<{ showtimes: Showtime[] }>
        >({
          route: `${httpRoute}/showtimes?${query}`,
          method: 'GET',
          headers: { Authorization: accessToken },
          responseType: 'json',
        });
        assert.strictEqual(statusCode, HTTP_STATUS_CODES.SUCCESS);
        assert.strictEqual(Array.isArray(fetchedShowtimes), true);

        for (let i = createdShowtimes.length - 1; i >= 0; --i) {
          const matchingShowtimeIndex = fetchedShowtimes.findIndex((u) => {
            return u.id === createdShowtimes[i]!.id;
          });
          if (matchingShowtimeIndex !== -1) {
            compareShowtimes({
              movies: createdMovies,
              halls: createdHalls,
              created: createdShowtimes[i]!,
              fetched: fetchedShowtimes[matchingShowtimeIndex]!,
            });

            createdShowtimes.splice(i, 1);
          }
        }

        assert.strictEqual(!!page, true);
        //@ts-expect-error null and 'null' (string) are interchangeable in this
        // context
        pagination = page;
      }
      /* eslint-enable no-await-in-loop */
      const removedAllRelevantShowtimes = !createdShowtimes.filter(
        (createdShowtime) => {
          return createdShowtime.hallId === hallIdToFilterBy;
        },
      ).length;
      assert.strictEqual(removedAllRelevantShowtimes, true);
    } finally {
      await clearDatabase(database);
    }
  });
  await test('Valid - Read a single page with all filters', async () => {
    const { accessToken } = await getAdminTokens(httpRoute);
    const { createdMovies, createdHalls, createdShowtimes } =
      await seedShowtimes(database, SINGLE_PAGE.CREATE, SINGLE_PAGE.CREATE / 2);
    const movieIdToFilterBy = createdMovies[0]!.id;
    const hallIdToFilterBy = createdHalls[0]!.id;

    try {
      const query = new URLSearchParams({
        'movie-id': movieIdToFilterBy,
        'hall-id': hallIdToFilterBy,
        'page-size': String(SINGLE_PAGE.SIZE),
      });
      const {
        statusCode,
        responseBody: { showtimes: fetchedShowtimes, page },
      } = await sendHttpRequest<
        'GET',
        'json',
        PaginatedResult<{ showtimes: Showtime[] }>
      >({
        route: `${httpRoute}/showtimes?${query}`,
        method: 'GET',
        headers: { Authorization: accessToken },
        responseType: 'json',
      });
      assert.strictEqual(statusCode, HTTP_STATUS_CODES.SUCCESS);
      assert.strictEqual(Array.isArray(fetchedShowtimes), true);

      for (let i = createdShowtimes.length - 1; i >= 0; --i) {
        const matchingShowtimeIndex = fetchedShowtimes.findIndex((u) => {
          return u.id === createdShowtimes[i]!.id;
        });
        if (matchingShowtimeIndex !== -1) {
          compareShowtimes({
            movies: createdMovies,
            halls: createdHalls,
            created: createdShowtimes[i]!,
            fetched: fetchedShowtimes[matchingShowtimeIndex]!,
          });

          createdShowtimes.splice(i, 1);
        }
      }
      const removedAllRelevantShowtimes = !createdShowtimes.filter(
        (createdShowtime) => {
          return (
            createdShowtime.movieId === movieIdToFilterBy &&
            createdShowtime.hallId === hallIdToFilterBy
          );
        },
      ).length;
      assert.strictEqual(removedAllRelevantShowtimes, true);

      assert.strictEqual(!!page, true);
      assert.strictEqual(page.hasNext, false);
      assert.strictEqual(page.cursor, null);
    } finally {
      await clearDatabase(database);
    }
  });
  await test('Valid - Read many pages with all filters', async () => {
    const { accessToken } = await getAdminTokens(httpRoute);
    const { createdMovies, createdHalls, createdShowtimes } =
      await seedShowtimes(
        database,
        MULTIPLE_PAGES.CREATE,
        MULTIPLE_PAGES.CREATE / 2,
      );
    const movieIdToFilterBy = createdMovies[0]!.id;
    const hallIdToFilterBy = createdHalls[0]!.id;

    try {
      let pagination = {
        hasNext: true,
        cursor: 'null',
      };

      /* eslint-disable no-await-in-loop */
      while (pagination.hasNext) {
        const query = new URLSearchParams({
          'movie-id': movieIdToFilterBy,
          'hall-id': hallIdToFilterBy,
          cursor: pagination.cursor,
          'page-size': String(MULTIPLE_PAGES.SIZE),
        });
        const {
          statusCode,
          responseBody: { showtimes: fetchedShowtimes, page },
        } = await sendHttpRequest<
          'GET',
          'json',
          PaginatedResult<{ showtimes: Showtime[] }>
        >({
          route: `${httpRoute}/showtimes?${query}`,
          method: 'GET',
          headers: { Authorization: accessToken },
          responseType: 'json',
        });
        assert.strictEqual(statusCode, HTTP_STATUS_CODES.SUCCESS);
        assert.strictEqual(Array.isArray(fetchedShowtimes), true);

        for (let i = createdShowtimes.length - 1; i >= 0; --i) {
          const matchingShowtimeIndex = fetchedShowtimes.findIndex((u) => {
            return u.id === createdShowtimes[i]!.id;
          });
          if (matchingShowtimeIndex !== -1) {
            compareShowtimes({
              movies: createdMovies,
              halls: createdHalls,
              created: createdShowtimes[i]!,
              fetched: fetchedShowtimes[matchingShowtimeIndex]!,
            });

            createdShowtimes.splice(i, 1);
          }
        }

        assert.strictEqual(!!page, true);
        //@ts-expect-error null and 'null' (string) are interchangeable in this
        // context
        pagination = page;
      }
      /* eslint-enable no-await-in-loop */
      const removedAllRelevantShowtimes = !createdShowtimes.filter(
        (createdShowtime) => {
          return (
            createdShowtime.movieId === movieIdToFilterBy &&
            createdShowtime.hallId === hallIdToFilterBy
          );
        },
      ).length;
      assert.strictEqual(removedAllRelevantShowtimes, true);
    } finally {
      await clearDatabase(database);
    }
  });
  await test('Valid - Read a lot pages with all filters', async () => {
    const { accessToken } = await getAdminTokens(httpRoute);
    const { createdMovies, createdHalls, createdShowtimes } =
      await seedShowtimes(
        database,
        LOT_OF_PAGES.CREATE,
        LOT_OF_PAGES.CREATE / 2,
      );
    const movieIdToFilterBy = createdMovies[0]!.id;
    const hallIdToFilterBy = createdHalls[0]!.id;

    try {
      let pagination = {
        hasNext: true,
        cursor: 'null',
      };

      /* eslint-disable no-await-in-loop */
      while (pagination.hasNext) {
        const query = new URLSearchParams({
          'movie-id': movieIdToFilterBy,
          'hall-id': hallIdToFilterBy,
          cursor: pagination.cursor,
          'page-size': String(LOT_OF_PAGES.SIZE),
        });
        const {
          statusCode,
          responseBody: { showtimes: fetchedShowtimes, page },
        } = await sendHttpRequest<
          'GET',
          'json',
          PaginatedResult<{ showtimes: Showtime[] }>
        >({
          route: `${httpRoute}/showtimes?${query}`,
          method: 'GET',
          headers: { Authorization: accessToken },
          responseType: 'json',
        });
        assert.strictEqual(statusCode, HTTP_STATUS_CODES.SUCCESS);
        assert.strictEqual(Array.isArray(fetchedShowtimes), true);

        for (let i = createdShowtimes.length - 1; i >= 0; --i) {
          const matchingShowtimeIndex = fetchedShowtimes.findIndex((u) => {
            return u.id === createdShowtimes[i]!.id;
          });
          if (matchingShowtimeIndex !== -1) {
            compareShowtimes({
              movies: createdMovies,
              halls: createdHalls,
              created: createdShowtimes[i]!,
              fetched: fetchedShowtimes[matchingShowtimeIndex]!,
            });

            createdShowtimes.splice(i, 1);
          }
        }

        assert.strictEqual(!!page, true);
        //@ts-expect-error null and 'null' (string) are interchangeable in this
        // context
        pagination = page;
      }
      /* eslint-enable no-await-in-loop */
      const removedAllRelevantShowtimes = !createdShowtimes.filter(
        (createdShowtime) => {
          return (
            createdShowtime.movieId === movieIdToFilterBy &&
            createdShowtime.hallId === hallIdToFilterBy
          );
        },
      ).length;
      assert.strictEqual(removedAllRelevantShowtimes, true);
    } finally {
      await clearDatabase(database);
    }
  });
  await test('Invalid - Create request with excess size', async () => {
    const { accessToken } = await getAdminTokens(httpRoute);

    const { statusCode } = await sendHttpRequest<'POST'>({
      route: `${httpRoute}/users`,
      method: 'POST',
      headers: { Authorization: accessToken },
      payload: {
        at: new Date(SHOWTIME.AT.MIN_VALUE.VALUE() + 1),
        movieId: randomAlphaNumericString(CONSTANTS.ONE_MEGABYTE),
        hallId: randomUUID(),
      },
      responseType: 'bytes',
    });

    assert.strictEqual(statusCode, HTTP_STATUS_CODES.CONTENT_TOO_LARGE);
  });
  await test('Valid - Create', async () => {
    const { accessToken } = await getAdminTokens(httpRoute);
    try {
      const { createdMovie } = await seedMovie(database);
      const createdHall = await seedHall(database);

      const showtimeData = {
        ...generateShowtimesData()[0]!,
        movieId: createdMovie.id,
        hallId: createdHall.id,
      } as const;

      const {
        statusCode,
        responseBody: { id, movieTitle, hallName, ...createdShowtime },
      } = await sendHttpRequest<'POST', 'json', Showtime>({
        route: `${httpRoute}/showtimes`,
        method: 'POST',
        headers: { Authorization: accessToken },
        payload: showtimeData,
        responseType: 'json',
      });
      assert.strictEqual(statusCode, HTTP_STATUS_CODES.CREATED);

      const { movieId: _1, hallId: _2, ...expectedShowtime } = showtimeData;

      assert.deepStrictEqual(
        { ...createdShowtime, at: new Date(createdShowtime.at) },
        { ...expectedShowtime, reservations: [] },
      );
      assert.deepStrictEqual(
        { movieTitle, hallName },
        { movieTitle: createdMovie.title, hallName: createdHall.name },
      );
    } finally {
      await clearDatabase(database);
    }
  });
  await test('Valid - Delete existent', async () => {
    const { accessToken } = await getAdminTokens(httpRoute);

    try {
      const { createdMovie } = await seedMovie(database);
      const createdHall = await seedHall(database);

      const showtimeData = {
        ...generateShowtimesData()[0]!,
        movieId: createdMovie.id,
        hallId: createdHall.id,
      } as const;

      const {
        statusCode,
        responseBody: { id: showtimeId },
      } = await sendHttpRequest<'POST', 'json', Showtime>({
        route: `${httpRoute}/showtimes`,
        method: 'POST',
        headers: { Authorization: accessToken },
        payload: showtimeData,
        responseType: 'json',
      });
      assert.strictEqual(statusCode, HTTP_STATUS_CODES.CREATED);

      const result = await sendHttpRequest<'DELETE', 'text', string>({
        route: `${httpRoute}/showtimes/${showtimeId}`,
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
  await test('Valid - Delete non-existent', async () => {
    const { accessToken } = await getAdminTokens(httpRoute);

    const { statusCode, responseBody } = await sendHttpRequest<
      'DELETE',
      'text',
      string
    >({
      route: `${httpRoute}/showtimes/${randomUUID()}`,
      method: 'DELETE',
      headers: { Authorization: accessToken },
      responseType: 'text',
    });

    assert.strictEqual(statusCode, HTTP_STATUS_CODES.NO_CONTENT);
    assert.strictEqual(responseBody, '');
  });
});
