import { HTTP_STATUS_CODES } from '@adamakiva/movie-reservation-system-shared';
import { eq } from 'drizzle-orm';
import type { Request } from 'express';

import { GeneralError } from '../../../utils/errors.ts';
import type {
  DatabaseHandler,
  DatabaseModel,
  RequestContext,
} from '../../../utils/types.ts';

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
  } catch (error) {
    throw handlePossibleShowtimeCreationError({
      error,
      at: showtimeToCreate.at,
      hall: showtimeToCreate.hallId,
      movie: showtimeToCreate.movieId,
    });
  }
}

async function reserveShowtimeTicket(params: {
  request: Request;
  context: RequestContext;
  showtimeTicket: ReserveShowtimeTicketValidatedData;
}): Promise<void> {
  const {
    request,
    context: { database, authentication, messageQueue },
    showtimeTicket,
  } = params;

  const handler = database.getHandler();
  const {
    hall: hallModel,
    showtime: showtimeModel,
    userShowtime: userShowtimeModel,
    movie: movieModel,
    user: userModel,
  } = database.getModels();
  const userId = authentication.getUserId(request.headers.authorization!);
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
        showtimeId,
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
            showtimeId: createUserShowtimeSubQuery.showtimeId,
            userShowtimeId: createUserShowtimeSubQuery.userShowtimeId,
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
          userShowtimeId,
          userDetails: { id: userId, email: userEmail },
          // Used to send an email with the reservation details
          movieDetails: {
            showtimeId,
            hallName,
            movieTitle,
            price,
            at,
            row,
            column,
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
    } catch (error) {
      throw handlePossibleTicketDuplicationError({
        error,
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
      showtimeId: userShowtimeModel.showtimeId,
      userShowtimeId: userShowtimeModel.id,
      userId: userShowtimeModel.userId,
      row: userShowtimeModel.row,
      column: userShowtimeModel.column,
    }),
  );

  return createUserShowtimeSubQuery;
}

/**********************************************************************************/

export { createShowtime, reserveShowtimeTicket };
