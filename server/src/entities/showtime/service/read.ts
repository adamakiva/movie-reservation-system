import { and, asc, eq, gt, or, type SQL } from 'drizzle-orm';

import type {
  DatabaseHandler,
  DatabaseModel,
  PaginatedResult,
  RequestContext,
} from '../../../utils/types.ts';

import { encodeCursor } from '../../utils.validator.ts';

import type {
  GetShowtimeValidatedData,
  GetUserShowtimesValidatedData,
  Showtime,
  UserShowtime,
} from './utils.ts';

/**********************************************************************************/

async function getShowtimes(
  context: RequestContext,
  pagination: GetShowtimeValidatedData,
): Promise<PaginatedResult<{ showtimes: Showtime[] }>> {
  const { database } = context;
  const { movieId, hallId } = pagination;

  const handler = database.getHandler();
  const {
    showtime: showtimeModel,
    movie: movieModel,
    hall: hallModel,
    userShowtime: userShowtimeModel,
  } = database.getModels();

  const filters = buildFilters({ movieId, hallId }, showtimeModel);

  const getPaginatedShowtimes = buildGetPaginatedShowtimesCTE({
    handler,
    models: {
      showtime: showtimeModel,
      movie: movieModel,
      hall: hallModel,
    },
    pagination,
    filters,
  });

  const paginatedShowtimes = await handler
    .with(getPaginatedShowtimes)
    .select({
      id: getPaginatedShowtimes.showtimeId,
      at: getPaginatedShowtimes.at,
      movieTitle: getPaginatedShowtimes.movieTitle,
      hallName: getPaginatedShowtimes.hallName,
      reservation: {
        userId: userShowtimeModel.userId,
        row: userShowtimeModel.row,
        column: userShowtimeModel.column,
      },
      createdAt: getPaginatedShowtimes.createdAt,
    })
    .from(getPaginatedShowtimes)
    .leftJoin(
      userShowtimeModel,
      eq(userShowtimeModel.showtimeId, getPaginatedShowtimes.showtimeId),
    )
    .orderBy(
      asc(getPaginatedShowtimes.createdAt),
      asc(getPaginatedShowtimes.showtimeId),
    );

  return sanitizePaginatedShowtimes(paginatedShowtimes, pagination.pageSize);
}

async function getUserShowtimes(
  context: RequestContext,
  pagination: GetUserShowtimesValidatedData,
): Promise<PaginatedResult<{ userShowtimes: unknown }>> {
  const { database } = context;
  const { userId, cursor, pageSize } = pagination;

  const handler = database.getHandler();
  const {
    showtime: showtimeModel,
    movie: movieModel,
    hall: hallModel,
    userShowtime,
  } = database.getModels();

  const userShowtimesPage = await handler
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

  return sanitizePaginatedUserShowtimes(userShowtimesPage, pagination.pageSize);
}

/**********************************************************************************/

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

function buildGetPaginatedShowtimesCTE(params: {
  handler: DatabaseHandler;
  models: {
    showtime: DatabaseModel<'showtime'>;
    movie: DatabaseModel<'movie'>;
    hall: DatabaseModel<'hall'>;
  };
  pagination: GetShowtimeValidatedData;
  filters: ReturnType<typeof buildFilters>;
}) {
  const {
    handler,
    models: { showtime: showtimeModel, movie: movieModel, hall: hallModel },
    pagination: { cursor, pageSize },
    filters,
  } = params;

  const getPaginatedShowtimesSubQuery = handler.$with('paginated_showtimes').as(
    handler
      .select({
        showtimeId: showtimeModel.id,
        at: showtimeModel.at,
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
      .orderBy(asc(showtimeModel.createdAt), asc(showtimeModel.id)),
  );

  return getPaginatedShowtimesSubQuery;
}

function sanitizePaginatedShowtimes(
  paginatedShowtimes: (Omit<Showtime, 'reservations'> & {
    reservation: Showtime['reservations'][number] | null;
    createdAt: Date;
  })[],
  pageSize: number,
) {
  const groupedShowtimes = Object.groupBy(paginatedShowtimes, (showtime) => {
    return showtime.id;
  });
  const groupedAndSanitizedShowtimes = Object.values(groupedShowtimes).map(
    (showtimes) => {
      const { id, at, movieTitle, hallName, createdAt } = showtimes![0]!;

      return {
        id,
        at,
        movieTitle,
        hallName,
        createdAt,
        reservations:
          showtimes
            ?.filter((showtime) => {
              return showtime.reservation;
            })
            .map((showtime) => {
              return {
                // The undefined showtimes are filtered above so the assertion
                // is fine
                userId: showtime.reservation!.userId,
                row: showtime.reservation!.row,
                column: showtime.reservation!.column,
              };
            }) ?? [],
      };
    },
  );

  if (groupedAndSanitizedShowtimes.length <= pageSize) {
    return {
      showtimes: groupedAndSanitizedShowtimes.map(sanitizeShowtime),
      page: {
        hasNext: false,
        cursor: null,
      },
    } as const;
  }

  groupedAndSanitizedShowtimes.pop();
  const lastShowtime =
    groupedAndSanitizedShowtimes[groupedAndSanitizedShowtimes.length - 1]!;

  return {
    showtimes: groupedAndSanitizedShowtimes.map(sanitizeShowtime),
    page: {
      hasNext: true,
      cursor: encodeCursor(lastShowtime.id, lastShowtime.createdAt),
    },
  } as const;
}

function sanitizeShowtime(showtime: Showtime & { createdAt: Date }) {
  const { createdAt, ...fields } = showtime;

  return fields;
}

function sanitizePaginatedUserShowtimes(
  userShowtimes: (UserShowtime & { createdAt: Date })[],
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
  userReservedShowtimes: Parameters<
    typeof sanitizePaginatedUserShowtimes
  >[0][number],
) {
  const { createdAt, ...fields } = userReservedShowtimes;

  return fields;
}

/**********************************************************************************/

export { getShowtimes, getUserShowtimes };
