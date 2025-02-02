import pg from 'postgres';

import {
  ERROR_CODES,
  GeneralError,
  HTTP_STATUS_CODES,
} from '../../../utils/index.js';

import type {
  validateCancelUserShowtimeReservation,
  validateCreateShowtime,
  validateDeleteShowtime,
  validateGetShowtimes,
  validateGetUserShowtimes,
  validateReserveShowtimeTicket,
} from '../validator.js';

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

type ShowtimeTicket = {
  hallName: string;
  movieTitle: string;
  at: Date;
  row: number;
  column: number;
};

/**********************************************************************************/

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
    // Name matching the database schema definition (showtime schema)
    // @see file:///./../../../database/schemas.ts
    case ERROR_CODES.POSTGRES.FOREIGN_KEY_VIOLATION:
      return handleForeignKeyNotFoundError({ err, movie, hall });
    default:
      return err;
  }
}

function handleForeignKeyNotFoundError(params: {
  err: pg.PostgresError;
  movie: string;
  hall: string;
}) {
  const { err, movie, hall } = params;

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

  return err;
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
  handlePossibleShowtimeCreationError,
  handlePossibleTicketDuplicationError,
  type CancelUserShowtimeValidatedData,
  type CreateShowtimeValidatedData,
  type DeleteShowtimeValidatedData,
  type GetShowtimeValidatedData,
  type GetUserShowtimesValidatedData,
  type ReserveShowtimeTicketValidatedData,
  type Showtime,
  type ShowtimeTicket,
};
