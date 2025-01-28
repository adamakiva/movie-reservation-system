import { eq } from 'drizzle-orm';
import type { Request } from 'express';

import {
  type DatabaseHandler,
  type DatabaseModel,
  GeneralError,
  HTTP_STATUS_CODES,
  type RequestContext,
} from '../../../utils/index.js';

import {
  type CreateShowtimeValidatedData,
  handlePossibleDuplicationError,
  type ReserveShowtimeTicketValidatedData,
  type Showtime,
  type ShowtimeTicket,
} from './utils.js';

/**********************************************************************************/

async function createShowtime(
  context: RequestContext,
  showtimeToCreate: CreateShowtimeValidatedData,
): Promise<Showtime> {
  const createdShowtime = await insertShowtimeToDatabase(
    context.database,
    showtimeToCreate,
  );

  return createdShowtime;
}

async function reserveShowtimeTicket(params: {
  req: Request;
  context: RequestContext;
  showtimeTicket: ReserveShowtimeTicketValidatedData;
}): Promise<ShowtimeTicket> {
  const {
    req,
    context: { database, authentication },
    showtimeTicket,
  } = params;

  const userId = authentication.getUserId(req.headers.authorization!);

  const createdShowtimeTicket = await insertShowtimeTicketToDatabase({
    database,
    showtimeTicket,
    userId,
  });

  // TODO Add payment processing. This operation should be blocking for the client
  // as well. Reason being that the user should receive a confirmation his payment
  // was accepted and there's no point to not lock the UI until that happens.

  return createdShowtimeTicket;
}

/**********************************************************************************/

async function insertShowtimeToDatabase(
  database: RequestContext['database'],
  showtimeToCreate: CreateShowtimeValidatedData,
) {
  const handler = database.getHandler();
  const {
    showtime: showtimeModel,
    movie: movieModel,
    hall: hallModel,
  } = database.getModels();

  const [movieTitle, hallName] = await Promise.all([
    getMovieTitle({
      handler,
      movieModel,
      movieId: showtimeToCreate.movieId,
    }),
    getHallName({
      handler,
      hallModel,
      hallId: showtimeToCreate.hallId,
    }),
  ]);

  try {
    const createdShowtime = (
      await handler.insert(showtimeModel).values(showtimeToCreate).returning({
        id: showtimeModel.id,
        at: showtimeModel.at,
        reservations: showtimeModel.reservations,
      })
    )[0]!;

    return { ...createdShowtime, movieTitle, hallName } as const;
  } catch (err) {
    throw handlePossibleDuplicationError({
      err,
      showtime: showtimeToCreate.at,
      hall: hallName,
    });
  }
}

async function insertShowtimeTicketToDatabase(params: {
  database: RequestContext['database'];
  showtimeTicket: ReserveShowtimeTicketValidatedData;
  userId: string;
}) {
  const { database, showtimeTicket, userId } = params;

  const handler = database.getHandler();
  const {
    hall: hallModel,
    showtime: showtimeModel,
    userShowtime: userShowtimeModel,
    movie: movieModel,
  } = database.getModels();
  const { showtimeId } = showtimeTicket;

  const createdShowtimeTicket = await handler.transaction(
    async (transaction) => {
      await checkTicketValues({
        handler: transaction,
        models: { hallModel, showtimeModel },
        showtimeTicket,
      });

      await transaction
        .insert(userShowtimeModel)
        .values({ userId, showtimeId })
        .onConflictDoNothing({
          target: [userShowtimeModel.showtimeId, userShowtimeModel.userId],
        });

      return await getUserTicketInformation({
        handler: transaction,
        models: { showtimeModel, hallModel, movieModel },
        showtimeTicket,
      });
    },
  );

  return createdShowtimeTicket;
}

/**********************************************************************************/

async function getMovieTitle(params: {
  handler: DatabaseHandler;
  movieModel: DatabaseModel<'movie'>;
  movieId: string;
}) {
  const { handler, movieModel, movieId } = params;

  const movies = await handler
    .select({ title: movieModel.title })
    .from(movieModel)
    .where(eq(movieModel.id, movieId));
  if (!movies.length) {
    throw new GeneralError(
      HTTP_STATUS_CODES.NOT_FOUND,
      `Movie ${movieId} does not exist`,
    );
  }

  return movies[0]!.title;
}

async function getHallName(params: {
  handler: DatabaseHandler;
  hallModel: DatabaseModel<'hall'>;
  hallId: string;
}) {
  const { handler, hallModel, hallId } = params;

  const halls = await handler
    .select({ name: hallModel.name })
    .from(hallModel)
    .where(eq(hallModel.id, hallId));
  if (!halls.length) {
    throw new GeneralError(
      HTTP_STATUS_CODES.NOT_FOUND,
      `Hall ${hallId} does not exist`,
    );
  }

  return halls[0]!.name;
}

async function checkTicketValues(params: {
  handler: DatabaseHandler;
  models: {
    showtimeModel: DatabaseModel<'showtime'>;
    hallModel: DatabaseModel<'hall'>;
  };
  showtimeTicket: ReserveShowtimeTicketValidatedData;
}) {
  const {
    handler,
    models: { showtimeModel, hallModel },
    showtimeTicket,
  } = params;

  const showTimesData = await handler
    .select({
      reservations: showtimeModel.reservations,
      hallRows: hallModel.rows,
      hallColumns: hallModel.columns,
    })
    .from(showtimeModel)
    .where(eq(showtimeModel.id, showtimeTicket.showtimeId))
    .innerJoin(hallModel, eq(hallModel.id, showtimeModel.hallId));
  if (!showTimesData.length) {
    throw new GeneralError(HTTP_STATUS_CODES.BAD_REQUEST, 'Bad request');
  }
  const showTimeData = showTimesData[0]!;

  // Rows are 0 indexed for us, but 1 indexed for the end-user
  if (showTimeData.hallRows > showtimeTicket.row) {
    throw new GeneralError(HTTP_STATUS_CODES.BAD_REQUEST, 'Invalid row number');
  }
  if (showTimeData.hallColumns > showtimeTicket.column) {
    throw new GeneralError(
      HTTP_STATUS_CODES.BAD_REQUEST,
      'Invalid column number',
    );
  }

  for (const [row, column] of showTimeData.reservations) {
    if (showtimeTicket.row === row && showtimeTicket.column === column) {
      throw new GeneralError(
        HTTP_STATUS_CODES.CONFLICT,
        `Ticket [${row}, ${column}] is already reserved`,
      );
    }
  }
}

async function getUserTicketInformation(params: {
  handler: DatabaseHandler;
  models: {
    showtimeModel: DatabaseModel<'showtime'>;
    hallModel: DatabaseModel<'hall'>;
    movieModel: DatabaseModel<'movie'>;
  };
  showtimeTicket: ReserveShowtimeTicketValidatedData;
}) {
  const {
    handler,
    models: { showtimeModel, hallModel, movieModel },
    showtimeTicket,
  } = params;

  const ticketInformation = (
    await handler
      .select({
        hallName: hallModel.name,
        movieTitle: movieModel.title,
        at: showtimeModel.at,
      })
      .from(showtimeModel)
      .where(eq(showtimeModel, showtimeTicket.showtimeId))
      .innerJoin(hallModel, eq(hallModel, showtimeModel.hallId))
      .innerJoin(movieModel, eq(movieModel.id, showtimeModel.movieId))
  )[0]!; // Under the same transaction as the creation, so it must exist

  return {
    ...ticketInformation,
    row: showtimeTicket.row,
    column: showtimeTicket.column,
  } as const;
}

/**********************************************************************************/

export { createShowtime, reserveShowtimeTicket };
