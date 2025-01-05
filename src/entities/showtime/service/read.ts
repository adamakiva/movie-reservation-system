import { asc, type RequestContext } from '../../../utils/index.js';

import type { GetShowtimeValidatedData, Showtime } from './utils.js';

/**********************************************************************************/

async function getShowtimes(
  context: RequestContext,
  pagination: GetShowtimeValidatedData,
): Promise<Showtime[]> {
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
  const { showtime: showtimeModel, genre: genreModel } = database.getModels();
  const { cursor, pageSize } = pagination;

  // There may be a case to optimize this when searching. The number of joins may
  // be reduced by sending a fetch to get the movie title/hall name or both.
  // If the performance here is an issue, think about it

  const showtimesPage = await handler
    .select({
      id: showtimeModel.id,
      at: showtimeModel.at,
      reservations: showtimeModel.reservations,
      // TODO Continue here, add movie and hall id
      createdAt: showtimeModel.createdAt,
    })
    .from(showtimeModel)
    .where(
      cursor
        ? or(
            gt(showtimeModel.createdAt, cursor.createdAt),
            and(
              eq(showtimeModel.createdAt, cursor.createdAt),
              gt(showtimeModel.id, cursor.showtimeId),
            ),
          )
        : undefined,
    )
    .innerJoin(genreModel, eq(genreModel.id, showtimeModel.genreId))
    // +1 Will allow us to check if there is an additional page after the current
    // one
    .limit(pageSize + 1)
    .orderBy(asc(showtimeModel.createdAt), asc(showtimeModel.id));

  return showtimesPage;
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
