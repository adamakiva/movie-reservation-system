import { eq } from 'drizzle-orm';
import type { Request } from 'express';

import {
  GeneralError,
  HTTP_STATUS_CODES,
  type DatabaseHandler,
  type DatabaseModel,
  type RequestContext,
} from '../../../utils/index.js';

import {
  handlePossibleShowtimeCreationError,
  handlePossibleTicketDuplicationError,
  type CreateShowtimeValidatedData,
  type ReserveShowtimeTicketValidatedData,
  type Showtime,
  type ShowtimeTicket,
} from './utils.js';

/**********************************************************************************/

async function createShowtime(
  context: RequestContext,
  showtimeToCreate: CreateShowtimeValidatedData,
): Promise<Showtime> {
  const { database } = context;
  const handler = database.getHandler();
  const {
    showtime: showtimeModel,
    movie: movieModel,
    hall: hallModel,
  } = database.getModels();

  try {
    const createShowtimeSubQuery = buildInsertShowtimeCTE({
      handler,
      showtimeModel,
      showtimeToCreate,
    });

    const createdShowtime = await handler
      .with(createShowtimeSubQuery)
      .select({
        id: createShowtimeSubQuery.id,
        at: createShowtimeSubQuery.at,
        movieTitle: movieModel.title,
        hallName: hallModel.name,
      })
      .from(createShowtimeSubQuery)
      .innerJoin(movieModel, eq(movieModel.id, createShowtimeSubQuery.movieId))
      .innerJoin(hallModel, eq(hallModel.id, createShowtimeSubQuery.hallId));

    return { ...createdShowtime[0]!, reservations: [] };
  } catch (err) {
    throw handlePossibleShowtimeCreationError({
      err,
      at: showtimeToCreate.at,
      hall: showtimeToCreate.hallId,
      movie: showtimeToCreate.movieId,
    });
  }
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

  const handler = database.getHandler();
  const {
    hall: hallModel,
    showtime: showtimeModel,
    userShowtime: userShowtimeModel,
    movie: movieModel,
  } = database.getModels();

  return await handler.transaction(async (transaction) => {
    await validateMovieReservation({
      handler: transaction,
      models: { hallModel, showtimeModel },
      showtimeTicket,
    });

    const createUserShowtimeSubQuery = buildInsertUserShowtimeCTE({
      handler,
      userShowtimeModel,
      showtimeTicket: { ...showtimeTicket, userId },
    });

    try {
      const createdShowtimeTicket = await transaction
        .with(createUserShowtimeSubQuery)
        .select({
          hallName: hallModel.name,
          movieTitle: movieModel.title,
          at: showtimeModel.at,
          row: createUserShowtimeSubQuery.row,
          column: createUserShowtimeSubQuery.column,
        })
        .from(showtimeModel)
        .where(eq(showtimeModel, showtimeTicket.showtimeId))
        .innerJoin(hallModel, eq(hallModel, showtimeModel.hallId))
        .innerJoin(movieModel, eq(movieModel.id, showtimeModel.movieId));

      // TODO Add payment processing. This operation should be blocking for the client
      // as well. Reason being that the user should receive a confirmation his payment
      // was accepted and there's no point to not lock the UI until that happens.

      return createdShowtimeTicket[0]!;
    } catch (err) {
      throw handlePossibleTicketDuplicationError({
        err,
        row: showtimeTicket.row,
        column: showtimeTicket.column,
      });
    }
  });
}

/**********************************************************************************/

function buildInsertShowtimeCTE(params: {
  handler: DatabaseHandler;
  showtimeModel: DatabaseModel<'showtime'>;
  showtimeToCreate: CreateShowtimeValidatedData;
}) {
  const { handler, showtimeModel, showtimeToCreate } = params;

  const createShowtimeSubQuery = handler.$with('insert_showtime').as(
    handler.insert(showtimeModel).values(showtimeToCreate).returning({
      id: showtimeModel.id,
      at: showtimeModel.at,
      movieId: showtimeModel.movieId,
      hallId: showtimeModel.hallId,
    }),
  );

  return createShowtimeSubQuery;
}

async function validateMovieReservation(params: {
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
      hallRows: hallModel.rows,
      hallColumns: hallModel.columns,
    })
    .from(showtimeModel)
    // Checks the showtime id is valid
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
}

function buildInsertUserShowtimeCTE(params: {
  handler: DatabaseHandler;
  userShowtimeModel: DatabaseModel<'userShowtime'>;
  showtimeTicket: ReserveShowtimeTicketValidatedData & { userId: string };
}) {
  const { handler, userShowtimeModel, showtimeTicket } = params;

  const createUserShowtimeSubQuery = handler.$with('create_user_showtime').as(
    handler.insert(userShowtimeModel).values(showtimeTicket).returning({
      row: userShowtimeModel.row,
      column: userShowtimeModel.column,
    }),
  );

  return createUserShowtimeSubQuery;
}

/**********************************************************************************/

export { createShowtime, reserveShowtimeTicket };
