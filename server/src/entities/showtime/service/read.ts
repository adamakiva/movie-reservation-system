import { and, asc, eq, gt, or, type SQL } from 'drizzle-orm';
import type { Locals } from 'express';

import type {
  DatabaseHandler,
  DatabaseModel,
  PaginatedResult,
  Pagination,
} from '../../../utils/types.ts';

import { encodeCursor, sanitizeElement } from '../../utils.ts';

import type {
  GetShowtimeValidatedData,
  GetUserShowtimesValidatedData,
  Showtime,
  UserShowtime,
} from './utils.ts';

/**********************************************************************************/

async function getShowtimes(
  context: Locals,
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
  context: Locals,
  pagination: GetUserShowtimesValidatedData,
): Promise<PaginatedResult<{ userShowtimes: UserShowtime[] }>> {
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

  return handler.$with('paginated_showtimes').as(
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
      .limit(pageSize + 1)
      .orderBy(asc(showtimeModel.createdAt), asc(showtimeModel.id)),
  );
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
              } as const;
            }) ?? [],
      } as const;
    },
  );

  let page: Pagination = { hasNext: false, cursor: null } as const;
  if (groupedAndSanitizedShowtimes.length > pageSize) {
    groupedAndSanitizedShowtimes.pop();
    const lastShowtime =
      groupedAndSanitizedShowtimes[groupedAndSanitizedShowtimes.length - 1]!;

    page = {
      hasNext: true,
      cursor: encodeCursor(lastShowtime.id, lastShowtime.createdAt),
    } as const;
  }

  return {
    showtimes: groupedAndSanitizedShowtimes.map(sanitizeElement),
    page,
  } as const;
}

function sanitizePaginatedUserShowtimes(
  userShowtimes: (UserShowtime & { createdAt: Date })[],
  pageSize: number,
) {
  let page: Pagination = { hasNext: false, cursor: null } as const;
  if (userShowtimes.length > pageSize) {
    userShowtimes.pop();
    const lastShowtime = userShowtimes[userShowtimes.length - 1]!;

    page = {
      hasNext: true,
      cursor: encodeCursor(lastShowtime.id, lastShowtime.createdAt),
    } as const;
  }

  return {
    userShowtimes: userShowtimes.map(sanitizeElement),
    page,
  } as const;
}

/**********************************************************************************/

export { getShowtimes, getUserShowtimes };
