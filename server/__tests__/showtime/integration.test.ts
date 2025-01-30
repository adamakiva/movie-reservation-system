import { deleteGenres } from '../genre/utils.js';
import { deleteHalls, seedHall } from '../hall/utils.js';
import { deleteMovies, seedMovie } from '../movie/utils.js';
import {
  after,
  assert,
  before,
  CONSTANTS,
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

import {
  deleteShowtimes,
  generateShowtimesData,
  seedShowtimes,
  type Showtime,
} from './utils.js';

/**********************************************************************************/

const { SHOWTIME } = VALIDATION;

async function createShowtime(params: {
  serverParams: ServerParams;
  genreIds: string[];
  movieIds: string[];
  hallIds: string[];
}) {
  const { genreIds, movieIds, hallIds, serverParams } = params;

  const { createdMovie, ids } = await seedMovie(serverParams);
  genreIds.push(...ids.genre);
  movieIds.push(...ids.movie);

  const { createdHall, hallIds: createdHallIds } = await seedHall(serverParams);
  hallIds.push(...createdHallIds);

  return {
    createdMovie,
    createdHall,
  };
}

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
  let serverParams: ServerParams = null!;
  before(async () => {
    serverParams = await initServer();
  });
  after(() => {
    terminateServer(serverParams);
  });

  await test('Valid - Read a single page without filters', async () => {
    const { accessToken } = await getAdminTokens(serverParams);
    const { createdMovies, createdHalls, createdShowtimes, ids } =
      await seedShowtimes(serverParams, 32);

    try {
      const query = new URLSearchParams({ 'page-size': String(32) });
      const res = await sendHttpRequest({
        route: `${serverParams.routes.http}/showtimes?${query}`,
        method: 'GET',
        headers: { Authorization: accessToken },
      });
      assert.strictEqual(res.status, HTTP_STATUS_CODES.SUCCESS);

      const responseBody = await res.json();
      assert.strictEqual(Array.isArray(responseBody.showtimes), true);

      const fetchedShowtimes = responseBody.showtimes as Showtime[];
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

      assert.strictEqual(!!responseBody.page, true);
      assert.strictEqual(responseBody.page.hasNext, false);
      assert.strictEqual(responseBody.page.cursor, null);
    } finally {
      await deleteMovies(serverParams, ...ids.movie);
      await deleteGenres(serverParams, ...ids.genre);
      await deleteHalls(serverParams, ...ids.hall);
      await deleteShowtimes(serverParams, ...ids.showtime);
    }
  });
  await test('Valid - Read many pages without filters', async () => {
    const { accessToken } = await getAdminTokens(serverParams);
    const { createdMovies, createdHalls, createdShowtimes, ids } =
      await seedShowtimes(serverParams, 1_024);

    try {
      let pagination = {
        hasNext: true,
        cursor: 'null',
      };

      /* eslint-disable no-await-in-loop */
      while (pagination.hasNext) {
        const query = new URLSearchParams({
          cursor: pagination.cursor,
          'page-size': String(8),
        });
        const res = await sendHttpRequest({
          route: `${serverParams.routes.http}/showtimes?${query}`,
          method: 'GET',
          headers: { Authorization: accessToken },
        });
        assert.strictEqual(res.status, HTTP_STATUS_CODES.SUCCESS);

        const responseBody = await res.json();
        assert.strictEqual(Array.isArray(responseBody.showtimes), true);

        const fetchedShowtimes = responseBody.showtimes as Showtime[];
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

        assert.strictEqual(!!responseBody.page, true);
        pagination = responseBody.page;
      }
      /* eslint-enable no-await-in-loop */
      assert.strictEqual(createdShowtimes.length, 0);
    } finally {
      await deleteMovies(serverParams, ...ids.movie);
      await deleteGenres(serverParams, ...ids.genre);
      await deleteHalls(serverParams, ...ids.hall);
      await deleteShowtimes(serverParams, ...ids.showtime);
    }
  });
  await test('Valid - Read a lot pages without filters', async () => {
    const { accessToken } = await getAdminTokens(serverParams);
    const { createdMovies, createdHalls, createdShowtimes, ids } =
      await seedShowtimes(serverParams, 8_192);

    try {
      let pagination = {
        hasNext: true,
        cursor: 'null',
      };

      /* eslint-disable no-await-in-loop */
      while (pagination.hasNext) {
        const query = new URLSearchParams({
          cursor: pagination.cursor,
          'page-size': String(8),
        });
        const res = await sendHttpRequest({
          route: `${serverParams.routes.http}/showtimes?${query}`,
          method: 'GET',
          headers: { Authorization: accessToken },
        });
        assert.strictEqual(res.status, HTTP_STATUS_CODES.SUCCESS);

        const responseBody = await res.json();
        assert.strictEqual(Array.isArray(responseBody.showtimes), true);

        const fetchedShowtimes = responseBody.showtimes as Showtime[];
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

        assert.strictEqual(!!responseBody.page, true);
        pagination = responseBody.page;
      }
      /* eslint-enable no-await-in-loop */
      assert.strictEqual(createdShowtimes.length, 0);
    } finally {
      await deleteMovies(serverParams, ...ids.movie);
      await deleteGenres(serverParams, ...ids.genre);
      await deleteHalls(serverParams, ...ids.hall);
      await deleteShowtimes(serverParams, ...ids.showtime);
    }
  });
  await test('Valid - Read a single page with movie filter', async () => {
    const { accessToken } = await getAdminTokens(serverParams);
    const { createdMovies, createdHalls, createdShowtimes, ids } =
      await seedShowtimes(serverParams, 32, 16);
    const movieIdToFilterBy = createdMovies[0]!.id;

    try {
      const query = new URLSearchParams({
        'movie-id': movieIdToFilterBy,
        'page-size': String(32),
      });
      const res = await sendHttpRequest({
        route: `${serverParams.routes.http}/showtimes?${query}`,
        method: 'GET',
        headers: { Authorization: accessToken },
      });
      assert.strictEqual(res.status, HTTP_STATUS_CODES.SUCCESS);

      const responseBody = await res.json();
      assert.strictEqual(Array.isArray(responseBody.showtimes), true);

      const fetchedShowtimes = responseBody.showtimes as Showtime[];
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

      assert.strictEqual(!!responseBody.page, true);
      assert.strictEqual(responseBody.page.hasNext, false);
      assert.strictEqual(responseBody.page.cursor, null);
    } finally {
      await deleteMovies(serverParams, ...ids.movie);
      await deleteGenres(serverParams, ...ids.genre);
      await deleteHalls(serverParams, ...ids.hall);
      await deleteShowtimes(serverParams, ...ids.showtime);
    }
  });
  await test('Valid - Read many pages with movie filter', async () => {
    const { accessToken } = await getAdminTokens(serverParams);
    const { createdMovies, createdHalls, createdShowtimes, ids } =
      await seedShowtimes(serverParams, 1_024, 512);
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
          'page-size': String(8),
        });
        const res = await sendHttpRequest({
          route: `${serverParams.routes.http}/showtimes?${query}`,
          method: 'GET',
          headers: { Authorization: accessToken },
        });
        assert.strictEqual(res.status, HTTP_STATUS_CODES.SUCCESS);

        const responseBody = await res.json();
        assert.strictEqual(Array.isArray(responseBody.showtimes), true);

        const fetchedShowtimes = responseBody.showtimes as Showtime[];
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

        assert.strictEqual(!!responseBody.page, true);
        pagination = responseBody.page;
      }
      /* eslint-enable no-await-in-loop */
      const removedAllRelevantShowtimes = !createdShowtimes.filter(
        (createdShowtime) => {
          return createdShowtime.movieId === movieIdToFilterBy;
        },
      ).length;
      assert.strictEqual(removedAllRelevantShowtimes, true);
    } finally {
      await deleteMovies(serverParams, ...ids.movie);
      await deleteGenres(serverParams, ...ids.genre);
      await deleteHalls(serverParams, ...ids.hall);
      await deleteShowtimes(serverParams, ...ids.showtime);
    }
  });
  await test('Valid - Read a lot pages with movie filter', async () => {
    const { accessToken } = await getAdminTokens(serverParams);
    const { createdMovies, createdHalls, createdShowtimes, ids } =
      await seedShowtimes(serverParams, 8_192, 4_096);
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
          'page-size': String(8),
        });
        const res = await sendHttpRequest({
          route: `${serverParams.routes.http}/showtimes?${query}`,
          method: 'GET',
          headers: { Authorization: accessToken },
        });
        assert.strictEqual(res.status, HTTP_STATUS_CODES.SUCCESS);

        const responseBody = await res.json();
        assert.strictEqual(Array.isArray(responseBody.showtimes), true);

        const fetchedShowtimes = responseBody.showtimes as Showtime[];
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

        assert.strictEqual(!!responseBody.page, true);
        pagination = responseBody.page;
      }
      /* eslint-enable no-await-in-loop */
      const removedAllRelevantShowtimes = !createdShowtimes.filter(
        (createdShowtime) => {
          return createdShowtime.movieId === movieIdToFilterBy;
        },
      ).length;
      assert.strictEqual(removedAllRelevantShowtimes, true);
    } finally {
      await deleteMovies(serverParams, ...ids.movie);
      await deleteGenres(serverParams, ...ids.genre);
      await deleteHalls(serverParams, ...ids.hall);
      await deleteShowtimes(serverParams, ...ids.showtime);
    }
  });
  await test('Valid - Read a single page with hall filter', async () => {
    const { accessToken } = await getAdminTokens(serverParams);
    const { createdMovies, createdHalls, createdShowtimes, ids } =
      await seedShowtimes(serverParams, 32, 16);
    const hallIdToFilterBy = createdHalls[0]!.id;

    try {
      const query = new URLSearchParams({
        'hall-id': hallIdToFilterBy,
        'page-size': String(32),
      });
      const res = await sendHttpRequest({
        route: `${serverParams.routes.http}/showtimes?${query}`,
        method: 'GET',
        headers: { Authorization: accessToken },
      });
      assert.strictEqual(res.status, HTTP_STATUS_CODES.SUCCESS);

      const responseBody = await res.json();
      assert.strictEqual(Array.isArray(responseBody.showtimes), true);

      const fetchedShowtimes = responseBody.showtimes as Showtime[];
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

      assert.strictEqual(!!responseBody.page, true);
      assert.strictEqual(responseBody.page.hasNext, false);
      assert.strictEqual(responseBody.page.cursor, null);
    } finally {
      await deleteMovies(serverParams, ...ids.movie);
      await deleteGenres(serverParams, ...ids.genre);
      await deleteHalls(serverParams, ...ids.hall);
      await deleteShowtimes(serverParams, ...ids.showtime);
    }
  });
  await test('Valid - Read many pages with hall filter', async () => {
    const { accessToken } = await getAdminTokens(serverParams);
    const { createdMovies, createdHalls, createdShowtimes, ids } =
      await seedShowtimes(serverParams, 1_024, 512);
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
          'page-size': String(8),
        });
        const res = await sendHttpRequest({
          route: `${serverParams.routes.http}/showtimes?${query}`,
          method: 'GET',
          headers: { Authorization: accessToken },
        });
        assert.strictEqual(res.status, HTTP_STATUS_CODES.SUCCESS);

        const responseBody = await res.json();
        assert.strictEqual(Array.isArray(responseBody.showtimes), true);

        const fetchedShowtimes = responseBody.showtimes as Showtime[];
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

        assert.strictEqual(!!responseBody.page, true);
        pagination = responseBody.page;
      }
      /* eslint-enable no-await-in-loop */
      const removedAllRelevantShowtimes = !createdShowtimes.filter(
        (createdShowtime) => {
          return createdShowtime.hallId === hallIdToFilterBy;
        },
      ).length;
      assert.strictEqual(removedAllRelevantShowtimes, true);
    } finally {
      await deleteMovies(serverParams, ...ids.movie);
      await deleteGenres(serverParams, ...ids.genre);
      await deleteHalls(serverParams, ...ids.hall);
      await deleteShowtimes(serverParams, ...ids.showtime);
    }
  });
  await test('Valid - Read a lot pages with hall filter', async () => {
    const { accessToken } = await getAdminTokens(serverParams);
    const { createdMovies, createdHalls, createdShowtimes, ids } =
      await seedShowtimes(serverParams, 8_192, 4_096);
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
          'page-size': String(8),
        });
        const res = await sendHttpRequest({
          route: `${serverParams.routes.http}/showtimes?${query}`,
          method: 'GET',
          headers: { Authorization: accessToken },
        });
        assert.strictEqual(res.status, HTTP_STATUS_CODES.SUCCESS);

        const responseBody = await res.json();
        assert.strictEqual(Array.isArray(responseBody.showtimes), true);

        const fetchedShowtimes = responseBody.showtimes as Showtime[];
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

        assert.strictEqual(!!responseBody.page, true);
        pagination = responseBody.page;
      }
      /* eslint-enable no-await-in-loop */
      const removedAllRelevantShowtimes = !createdShowtimes.filter(
        (createdShowtime) => {
          return createdShowtime.hallId === hallIdToFilterBy;
        },
      ).length;
      assert.strictEqual(removedAllRelevantShowtimes, true);
    } finally {
      await deleteMovies(serverParams, ...ids.movie);
      await deleteGenres(serverParams, ...ids.genre);
      await deleteHalls(serverParams, ...ids.hall);
      await deleteShowtimes(serverParams, ...ids.showtime);
    }
  });
  await test('Valid - Read a single page with all filters', async () => {
    const { accessToken } = await getAdminTokens(serverParams);
    const { createdMovies, createdHalls, createdShowtimes, ids } =
      await seedShowtimes(serverParams, 32, 16);
    const movieIdToFilterBy = createdMovies[0]!.id;
    const hallIdToFilterBy = createdHalls[0]!.id;

    try {
      const query = new URLSearchParams({
        'movie-id': movieIdToFilterBy,
        'hall-id': hallIdToFilterBy,
        'page-size': String(32),
      });
      const res = await sendHttpRequest({
        route: `${serverParams.routes.http}/showtimes?${query}`,
        method: 'GET',
        headers: { Authorization: accessToken },
      });
      assert.strictEqual(res.status, HTTP_STATUS_CODES.SUCCESS);

      const responseBody = await res.json();
      assert.strictEqual(Array.isArray(responseBody.showtimes), true);

      const fetchedShowtimes = responseBody.showtimes as Showtime[];
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

      assert.strictEqual(!!responseBody.page, true);
      assert.strictEqual(responseBody.page.hasNext, false);
      assert.strictEqual(responseBody.page.cursor, null);
    } finally {
      await deleteMovies(serverParams, ...ids.movie);
      await deleteGenres(serverParams, ...ids.genre);
      await deleteHalls(serverParams, ...ids.hall);
      await deleteShowtimes(serverParams, ...ids.showtime);
    }
  });
  await test('Valid - Read many pages with all filters', async () => {
    const { accessToken } = await getAdminTokens(serverParams);
    const { createdMovies, createdHalls, createdShowtimes, ids } =
      await seedShowtimes(serverParams, 1_024, 512);
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
          'page-size': String(8),
        });
        const res = await sendHttpRequest({
          route: `${serverParams.routes.http}/showtimes?${query}`,
          method: 'GET',
          headers: { Authorization: accessToken },
        });
        assert.strictEqual(res.status, HTTP_STATUS_CODES.SUCCESS);

        const responseBody = await res.json();
        assert.strictEqual(Array.isArray(responseBody.showtimes), true);

        const fetchedShowtimes = responseBody.showtimes as Showtime[];
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

        assert.strictEqual(!!responseBody.page, true);
        pagination = responseBody.page;
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
      await deleteMovies(serverParams, ...ids.movie);
      await deleteGenres(serverParams, ...ids.genre);
      await deleteHalls(serverParams, ...ids.hall);
      await deleteShowtimes(serverParams, ...ids.showtime);
    }
  });
  await test('Valid - Read a lot pages with all filters', async () => {
    const { accessToken } = await getAdminTokens(serverParams);
    const { createdMovies, createdHalls, createdShowtimes, ids } =
      await seedShowtimes(serverParams, 8_192, 4_096);
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
          'page-size': String(8),
        });
        const res = await sendHttpRequest({
          route: `${serverParams.routes.http}/showtimes?${query}`,
          method: 'GET',
          headers: { Authorization: accessToken },
        });
        assert.strictEqual(res.status, HTTP_STATUS_CODES.SUCCESS);

        const responseBody = await res.json();
        assert.strictEqual(Array.isArray(responseBody.showtimes), true);

        const fetchedShowtimes = responseBody.showtimes as Showtime[];
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

        assert.strictEqual(!!responseBody.page, true);
        pagination = responseBody.page;
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
      await deleteMovies(serverParams, ...ids.movie);
      await deleteGenres(serverParams, ...ids.genre);
      await deleteHalls(serverParams, ...ids.hall);
      await deleteShowtimes(serverParams, ...ids.showtime);
    }
  });
  await test('Invalid - Create request with excess size', async () => {
    const { status } = await sendHttpRequest({
      route: `${serverParams.routes.http}/users`,
      method: 'POST',
      payload: {
        at: new Date(SHOWTIME.AT.MIN_VALUE.VALUE() + 1),
        movieId: randomString(CONSTANTS.ONE_MEGABYTE_IN_BYTES),
        hallId: randomUUID(),
      },
    });

    assert.strictEqual(status, HTTP_STATUS_CODES.CONTENT_TOO_LARGE);
  });
  await test('Valid - Create', async () => {
    const { accessToken } = await getAdminTokens(serverParams);

    let showtimeId = '';
    const genreIds: string[] = [];
    const movieIds: string[] = [];
    const hallIds: string[] = [];

    try {
      const { createdMovie, createdHall } = await createShowtime({
        serverParams,
        genreIds,
        movieIds,
        hallIds,
      });

      const showtimeData = {
        ...generateShowtimesData()[0]!,
        movieId: createdMovie.id,
        hallId: createdHall.id,
      } as const;

      const res = await sendHttpRequest({
        route: `${serverParams.routes.http}/showtimes`,
        method: 'POST',
        headers: { Authorization: accessToken },
        payload: showtimeData,
      });
      assert.strictEqual(res.status, HTTP_STATUS_CODES.CREATED);

      const { id, movieTitle, hallName, ...createdShowtime } =
        (await res.json()) as Showtime;
      const { movieId: _1, hallId: _2, ...expectedShowtime } = showtimeData;
      showtimeId = id;

      assert.deepStrictEqual(
        { ...createdShowtime, at: new Date(createdShowtime.at) },
        expectedShowtime,
      );
      assert.deepStrictEqual(
        { movieTitle, hallName },
        { movieTitle: createdMovie.title, hallName: createdHall.name },
      );
    } finally {
      await deleteMovies(serverParams, ...movieIds);
      await deleteGenres(serverParams, ...genreIds);
      await deleteHalls(serverParams, ...hallIds);
      await deleteShowtimes(serverParams, showtimeId);
    }
  });
  await test('Valid - Delete existent', async () => {
    const { accessToken } = await getAdminTokens(serverParams);

    let showtimeId = '';
    const genreIds: string[] = [];
    const movieIds: string[] = [];
    const hallIds: string[] = [];

    try {
      const { createdMovie, createdHall } = await createShowtime({
        serverParams,
        genreIds,
        movieIds,
        hallIds,
      });

      const showtimeData = {
        ...generateShowtimesData()[0]!,
        movieId: createdMovie.id,
        hallId: createdHall.id,
      } as const;

      let res = await sendHttpRequest({
        route: `${serverParams.routes.http}/showtimes`,
        method: 'POST',
        headers: { Authorization: accessToken },
        payload: showtimeData,
      });
      assert.strictEqual(res.status, HTTP_STATUS_CODES.CREATED);

      ({ id: showtimeId } = (await res.json()) as Showtime);

      res = await sendHttpRequest({
        route: `${serverParams.routes.http}/showtimes/${showtimeId}`,
        method: 'DELETE',
        headers: { Authorization: accessToken },
      });

      const responseBody = await res.text();

      assert.strictEqual(res.status, HTTP_STATUS_CODES.NO_CONTENT);
      assert.strictEqual(responseBody, '');
    } finally {
      await deleteMovies(serverParams, ...movieIds);
      await deleteGenres(serverParams, ...genreIds);
      await deleteHalls(serverParams, ...hallIds);
      await deleteShowtimes(serverParams, showtimeId);
    }
  });
  await test('Valid - Delete non-existent', async () => {
    const { accessToken } = await getAdminTokens(serverParams);

    const res = await sendHttpRequest({
      route: `${serverParams.routes.http}/showtimes/${randomUUID()}`,
      method: 'DELETE',
      headers: { Authorization: accessToken },
    });

    const responseBody = await res.text();

    assert.strictEqual(res.status, HTTP_STATUS_CODES.NO_CONTENT);
    assert.strictEqual(responseBody, '');
  });
});
