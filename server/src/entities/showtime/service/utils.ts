import {
  ERROR_CODES,
  HTTP_STATUS_CODES,
  MESSAGE_QUEUE,
} from '@adamakiva/movie-reservation-system-shared';
import { and, eq, inArray, isNotNull } from 'drizzle-orm';
import pg from 'postgres';
import { ConsumerStatus, type AsyncMessage } from 'rabbitmq-client';

import { GeneralError, type RequestContext } from '../../../utils/index.ts';

import type {
  validateCancelUserShowtimeReservation,
  validateCreateShowtime,
  validateDeleteShowtime,
  validateGetShowtimes,
  validateGetUserShowtimes,
  validateReserveShowtimeTicket,
} from '../validator.ts';

/**********************************************************************************/

type GetShowtimeValidatedData = ReturnType<typeof validateGetShowtimes>;
type CreateShowtimeValidatedData = ReturnType<typeof validateCreateShowtime>;
type DeleteShowtimeValidatedData = ReturnType<typeof validateDeleteShowtime>;
type ReserveShowtimeTicketValidatedData = ReturnType<
  typeof validateReserveShowtimeTicket
>;
type CancelUserShowtimeValidatedData = ReturnType<
  typeof validateCancelUserShowtimeReservation
>;
type GetUserShowtimesValidatedData = ReturnType<
  typeof validateGetUserShowtimes
>;

type Showtime = {
  id: string;
  at: Date;
  reservations: {
    userId: string;
    row: number;
    column: number;
  }[];
  movieTitle: string;
  hallName: string;
};
type UserShowtime = {
  id: string;
  hallName: string;
  movieTitle: string;
  at: Date;
};
type ShowtimeTicket = {
  hallName: string;
  movieTitle: string;
  at: Date;
  row: number;
  column: number;
};

/**********************************************************************************/

function reserveShowtimeTicket(database: RequestContext['database']) {
  return async (
    message: Omit<AsyncMessage, 'body'> & {
      body: { userShowtimeId: string; transactionId: string };
    },
  ) => {
    const { correlationId, body } = message;

    if (correlationId !== MESSAGE_QUEUE.TICKET.RESERVE.CORRELATION_ID) {
      return ConsumerStatus.DROP;
    }
    const { userShowtimeId, transactionId } = body;

    const handler = database.getHandler();
    const { userShowtime: userShowtimeModel } = database.getModels();

    await handler
      .update(userShowtimeModel)
      .set({ transactionId })
      .where(eq(userShowtimeModel.id, userShowtimeId));

    return ConsumerStatus.ACK;
  };
}

function cancelShowtimeReservations(database: RequestContext['database']) {
  return async (
    message: Omit<AsyncMessage, 'body'> & {
      body: { showtimeId: string; userIds: string | string[] };
    },
  ) => {
    const { correlationId, body } = message;

    if (correlationId !== MESSAGE_QUEUE.TICKET.CANCEL.CORRELATION_ID) {
      return ConsumerStatus.DROP;
    }
    const { showtimeId, userIds } = body;

    const handler = database.getHandler();
    const { userShowtime: userShowtimeModel } = database.getModels();

    await handler.delete(userShowtimeModel).where(
      and(
        eq(userShowtimeModel.showtimeId, showtimeId),
        // Only delete confirmed reservations (Reservations which were payed for)
        isNotNull(userShowtimeModel.transactionId),
        !Array.isArray(userIds)
          ? eq(userShowtimeModel.userId, userIds)
          : inArray(userShowtimeModel.userId, userIds),
      ),
    );

    return ConsumerStatus.ACK;
  };
}

function handlePossibleShowtimeCreationError(params: {
  err: unknown;
  at: Date;
  movie: string;
  hall: string;
}) {
  const { err, at, hall, movie } = params;

  if (!(err instanceof pg.PostgresError)) {
    return err;
  }

  switch (err.code) {
    case ERROR_CODES.POSTGRES.UNIQUE_VIOLATION:
      return new GeneralError(
        HTTP_STATUS_CODES.CONFLICT,
        `A showtime at '${at.toISOString()}' in '${hall}' already exists`,
        err.cause,
      );
    case ERROR_CODES.POSTGRES.FOREIGN_KEY_VIOLATION:
      return handleForeignKeyNotFoundError({ err, movie, hall });
    default:
      return new GeneralError(
        HTTP_STATUS_CODES.SERVER_ERROR,
        'Should not be possible',
        err.cause,
      );
  }
}

function handleForeignKeyNotFoundError(params: {
  err: pg.PostgresError;
  movie: string;
  hall: string;
}) {
  const { err, movie, hall } = params;

  // Name matching the database schema definition (showtime schema)
  // @see file:///./../../../database/schemas.ts
  if (err.constraint_name === 'showtime_movie_id_fk') {
    return new GeneralError(
      HTTP_STATUS_CODES.NOT_FOUND,
      `Movie '${movie}' does not exist`,
      err.cause,
    );
  }
  if (err.constraint_name === 'showtime_hall_id_fk') {
    return new GeneralError(
      HTTP_STATUS_CODES.NOT_FOUND,
      `Hall '${hall}' does not exist`,
      err.cause,
    );
  }

  return new GeneralError(
    HTTP_STATUS_CODES.SERVER_ERROR,
    'Should not be possible',
    err.cause,
  );
}

function handlePossibleTicketDuplicationError(params: {
  err: unknown;
  row: number;
  column: number;
}) {
  const { err, row, column } = params;

  if (
    !(err instanceof pg.PostgresError) ||
    err.code !== ERROR_CODES.POSTGRES.UNIQUE_VIOLATION
  ) {
    return err;
  }

  return new GeneralError(
    HTTP_STATUS_CODES.CONFLICT,
    `Seat at '[${row},${column}]' is already taken`,
    err.cause,
  );
}

/**********************************************************************************/

export {
  cancelShowtimeReservations,
  handlePossibleShowtimeCreationError,
  handlePossibleTicketDuplicationError,
  reserveShowtimeTicket,
  type CancelUserShowtimeValidatedData,
  type CreateShowtimeValidatedData,
  type DeleteShowtimeValidatedData,
  type GetShowtimeValidatedData,
  type GetUserShowtimesValidatedData,
  type ReserveShowtimeTicketValidatedData,
  type Showtime,
  type ShowtimeTicket,
  type UserShowtime,
};
