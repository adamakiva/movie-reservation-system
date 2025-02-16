import { eq } from 'drizzle-orm';
import type { Request } from 'express';

import {
  GeneralError,
  HTTP_STATUS_CODES,
  type DatabaseHandler,
  type DatabaseModel,
  type RequestContext,
} from '../../../utils/index.ts';

import {
  handlePossibleShowtimeCreationError,
  handlePossibleTicketDuplicationError,
  type CreateShowtimeValidatedData,
  type ReserveShowtimeTicketValidatedData,
  type Showtime,
} from './utils.ts';

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

    const [createdShowtime] = await handler
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

    return { ...createdShowtime!, reservations: [] };
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
}): Promise<void> {
  const {
    req,
    context: { database, authentication, messageQueue },
    showtimeTicket,
  } = params;

  const userId = authentication.getUserId(req.headers.authorization!);

  const handler = database.getHandler();
  const {
    hall: hallModel,
    showtime: showtimeModel,
    userShowtime: userShowtimeModel,
    movie: movieModel,
    user: userModel,
  } = database.getModels();

  const createUserShowtimeSubQuery = buildInsertUserShowtimeCTE({
    handler,
    userShowtimeModel,
    showtimeTicket: { ...showtimeTicket, userId },
  });
  await handler.transaction(async (transaction) => {
    await validateMovieReservation({
      handler: transaction,
      models: { hallModel, showtimeModel },
      showtimeTicket,
    });

    try {
      const {
        userShowtimeId,
        userEmail,
        userId,
        hallName,
        movieTitle,
        price,
        at,
        row,
        column,
      } = (
        await transaction
          .with(createUserShowtimeSubQuery)
          .select({
            userShowtimeId: createUserShowtimeSubQuery.userShowtimeId,
            showtimeId: createUserShowtimeSubQuery.showtimeId,
            userId: createUserShowtimeSubQuery.userId,
            row: createUserShowtimeSubQuery.row,
            column: createUserShowtimeSubQuery.column,
            hallName: hallModel.name,
            movieTitle: movieModel.title,
            price: movieModel.price,
            at: showtimeModel.at,
            userEmail: userModel.email,
          })
          .from(createUserShowtimeSubQuery)
          .innerJoin(
            showtimeModel,
            eq(showtimeModel.id, createUserShowtimeSubQuery.showtimeId),
          )
          .innerJoin(hallModel, eq(hallModel, showtimeModel.hallId))
          .innerJoin(movieModel, eq(movieModel.id, showtimeModel.movieId))
          .innerJoin(
            userModel,
            eq(userModel.id, createUserShowtimeSubQuery.userId),
          )
      )[0]!;

      await messageQueue.publish({
        publisher: 'ticket',
        exchange: 'mrs',
        routingKey: 'mrs-ticket-reserve',
        data: {
          // TODO Add payment method
          userShowtimeId: userShowtimeId,
          userDetails: { id: userId, email: userEmail },
          // Used to send an email with the reservation details
          movieDetails: {
            hallName: hallName,
            movieTitle: movieTitle,
            price: price,
            at: at,
            row: row,
            column: column,
          },
        },
        options: {
          durable: true,
          mandatory: true,
          replyTo: 'mrs.ticket.reserve.reply.to',
          correlationId: 'reserve',
          contentType: 'application/json',
        },
      });
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
      userShowtimeId: userShowtimeModel.id,
      showtimeId: userShowtimeModel.showtimeId,
      userId: userShowtimeModel.userId,
      row: userShowtimeModel.row,
      column: userShowtimeModel.column,
    }),
  );

  return createUserShowtimeSubQuery;
}

/**********************************************************************************/

export { createShowtime, reserveShowtimeTicket };
