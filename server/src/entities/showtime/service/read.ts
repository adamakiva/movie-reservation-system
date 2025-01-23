import { and, asc, eq, gt, or, type SQL } from 'drizzle-orm';

import {
  encodeCursor,
  type PaginatedResult,
  type RequestContext,
} from '../../../utils/index.js';

import type { GetShowtimeValidatedData, Showtime } from './utils.js';

/**********************************************************************************/

async function getShowtimes(
  context: RequestContext,
  pagination: GetShowtimeValidatedData,
): Promise<PaginatedResult<{ showtimes: Showtime[] }>> {
  const showtimes = await getPaginatedShowtimesFromDatabase(
    context.database,
    pagination,
  );

  return sanitizePaginatedShowtimes(showtimes, pagination.pageSize);
}

/**********************************************************************************/

async function getPaginatedShowtimesFromDatabase(
  database: RequestContext['database'],
  pagination: GetShowtimeValidatedData,
) {
  const handler = database.getHandler();
  const {
    showtime: showtimeModel,
    movie: movieModel,
    hall: hallModel,
  } = database.getModels();
  const { cursor, pageSize, movieId, hallId } = pagination;

  const filters = buildFilters({ movieId, hallId }, showtimeModel);

  const showtimesPage = await handler
    .select({
      id: showtimeModel.id,
      at: showtimeModel.at,
      reservations: showtimeModel.reservations,
      movieTitle: movieModel.title,
      hallName: hallModel.name,
      createdAt: showtimeModel.createdAt,
    })
    .from(showtimeModel)
    .where(
      cursor
        ? and(
            filters,
            or(
              gt(showtimeModel.createdAt, cursor.createdAt),
              and(
                eq(showtimeModel.createdAt, cursor.createdAt),
                gt(showtimeModel.id, cursor.showtimeId),
              ),
            ),
          )
        : filters,
    )
    .innerJoin(movieModel, eq(movieModel.id, showtimeModel.movieId))
    .innerJoin(hallModel, eq(hallModel.id, showtimeModel.hallId))
    // +1 Will allow us to check if there is an additional page after the current
    // one
    .limit(pageSize + 1)
    .orderBy(asc(showtimeModel.createdAt), asc(showtimeModel.id));

  return showtimesPage;
}

function buildFilters(
  filters: Pick<GetShowtimeValidatedData, 'movieId' | 'hallId'>,
  model: ReturnType<RequestContext['database']['getModels']>['showtime'],
) {
  const { movieId, hallId } = filters;

  const filterQueries: SQL[] = [];
  if (movieId) {
    filterQueries.push(eq(model.movieId, movieId));
  }
  if (hallId) {
    filterQueries.push(eq(model.hallId, hallId));
  }

  if (!filterQueries.length) {
    return undefined;
  }
  if (filterQueries.length === 1) {
    return filterQueries[0];
  }

  return and(...filterQueries);
}

function sanitizePaginatedShowtimes(
  showtimes: Awaited<ReturnType<typeof getPaginatedShowtimesFromDatabase>>,
  pageSize: number,
) {
  if (showtimes.length > pageSize) {
    showtimes.pop();
    const lastShowtime = showtimes[showtimes.length - 1]!;

    return {
      showtimes: showtimes.map(sanitizeShowtime),
      page: {
        hasNext: true,
        cursor: encodeCursor(lastShowtime.id, lastShowtime.createdAt),
      },
    } as const;
  }

  return {
    showtimes: showtimes.map(sanitizeShowtime),
    page: {
      hasNext: false,
      cursor: null,
    },
  } as const;
}

function sanitizeShowtime(
  showtime: Awaited<
    ReturnType<typeof getPaginatedShowtimesFromDatabase>
  >[number],
) {
  const { createdAt, ...fields } = showtime;

  return fields;
}

/**********************************************************************************/

export { getShowtimes };
