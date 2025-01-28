import { and, asc, eq, gt, or, type SQL } from 'drizzle-orm';

import {
  encodeCursor,
  type DatabaseModel,
  type PaginatedResult,
  type RequestContext,
} from '../../../utils/index.js';

import type {
  GetShowtimeValidatedData,
  GetUserShowtimesValidatedData,
  Showtime,
} from './utils.js';

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

async function getUserShowtimes(
  context: RequestContext,
  pagination: GetUserShowtimesValidatedData,
): Promise<PaginatedResult<{ userShowtimes: unknown }>> {
  const userShowtimes = await getPaginatedUserShowtimesFromDatabase(
    context.database,
    pagination,
  );

  return sanitizePaginatedUserShowtimes(userShowtimes, pagination.pageSize);
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
  showtimeModel: DatabaseModel<'showtime'>,
) {
  const { movieId, hallId } = filters;

  const filterQueries: SQL[] = [];
  if (movieId) {
    filterQueries.push(eq(showtimeModel.movieId, movieId));
  }
  if (hallId) {
    filterQueries.push(eq(showtimeModel.hallId, hallId));
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
  if (showtimes.length <= pageSize) {
    return {
      showtimes: showtimes.map(sanitizeShowtime),
      page: {
        hasNext: false,
        cursor: null,
      },
    } as const;
  }

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

function sanitizeShowtime(
  showtime: Awaited<
    ReturnType<typeof getPaginatedShowtimesFromDatabase>
  >[number],
) {
  const { createdAt, ...fields } = showtime;

  return fields;
}

async function getPaginatedUserShowtimesFromDatabase(
  database: RequestContext['database'],
  pagination: GetUserShowtimesValidatedData,
) {
  const handler = database.getHandler();
  const {
    showtime: showtimeModel,
    movie: movieModel,
    hall: hallModel,
    userShowtime,
  } = database.getModels();
  const { userId, cursor, pageSize } = pagination;

  const userReservedShowtimesPage = await handler
    .select({
      id: userShowtime.id,
      hallName: hallModel.name,
      movieTitle: movieModel.title,
      at: showtimeModel.at,
      createdAt: userShowtime.createdAt,
    })
    .from(userShowtime)
    .where(
      and(
        eq(userShowtime.userId, userId),
        cursor
          ? or(
              gt(userShowtime.createdAt, cursor.createdAt),
              and(
                eq(userShowtime.createdAt, cursor.createdAt),
                gt(userShowtime.id, cursor.id),
              ),
            )
          : undefined,
      ),
    )
    .innerJoin(showtimeModel, eq(showtimeModel.id, userShowtime.showtimeId))
    .innerJoin(movieModel, eq(movieModel.id, showtimeModel.movieId))
    .innerJoin(hallModel, eq(hallModel.id, showtimeModel.hallId))
    // +1 Will allow us to check if there is an additional page after the current
    // one
    .limit(pageSize + 1)
    .orderBy(asc(showtimeModel.createdAt), asc(showtimeModel.id));

  return userReservedShowtimesPage;
}

function sanitizePaginatedUserShowtimes(
  userShowtimes: Awaited<
    ReturnType<typeof getPaginatedUserShowtimesFromDatabase>
  >,
  pageSize: number,
) {
  if (userShowtimes.length <= pageSize) {
    return {
      userShowtimes: userShowtimes.map(sanitizeUserShowtimesPage),
      page: {
        hasNext: false,
        cursor: null,
      },
    } as const;
  }

  userShowtimes.pop();
  const lastShowtime = userShowtimes[userShowtimes.length - 1]!;

  return {
    userShowtimes: userShowtimes.map(sanitizeUserShowtimesPage),
    page: {
      hasNext: true,
      cursor: encodeCursor(lastShowtime.id, lastShowtime.createdAt),
    },
  } as const;
}

function sanitizeUserShowtimesPage(
  userReservedShowtimes: Awaited<
    ReturnType<typeof getPaginatedUserShowtimesFromDatabase>
  >[number],
) {
  const { createdAt, ...fields } = userReservedShowtimes;

  return fields;
}

/**********************************************************************************/

export { getShowtimes, getUserShowtimes };
