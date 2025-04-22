import {
  ERROR_CODES,
  HTTP_STATUS_CODES,
} from '@adamakiva/movie-reservation-system-shared';
import type pg from 'postgres';

import {
  GeneralError,
  isDatabaseError,
  isError,
} from '../../../utils/errors.ts';

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

function handlePossibleShowtimeCreationError(params: {
  error: unknown;
  at: Date;
  movie: string;
  hall: string;
}) {
  const { error, at, hall, movie } = params;

  if (!isError(error)) {
    return new GeneralError(
      HTTP_STATUS_CODES.SERVER_ERROR,
      'Thrown a non error object',
    );
  }
  if (!isDatabaseError(error)) {
    return error;
  }

  switch (error.code) {
    case ERROR_CODES.POSTGRES.UNIQUE_VIOLATION:
      return new GeneralError(
        HTTP_STATUS_CODES.CONFLICT,
        `A showtime at '${at.toISOString()}' in '${hall}' already exists`,
        error.cause,
      );
    case ERROR_CODES.POSTGRES.FOREIGN_KEY_VIOLATION:
      return handleForeignKeyNotFoundError({ error, movie, hall });
    default:
      return new GeneralError(
        HTTP_STATUS_CODES.SERVER_ERROR,
        'Should not be possible',
        error.cause,
      );
  }
}

function handleForeignKeyNotFoundError(params: {
  error: pg.PostgresError;
  movie: string;
  hall: string;
}) {
  const { error, movie, hall } = params;

  // Name matching the database schema definition (showtime schema)
  // @see file:///./../../../database/schemas.ts
  if (error.constraint_name === 'showtime_movie_id_fk') {
    return new GeneralError(
      HTTP_STATUS_CODES.NOT_FOUND,
      `Movie '${movie}' does not exist`,
      error.cause,
    );
  }
  if (error.constraint_name === 'showtime_hall_id_fk') {
    return new GeneralError(
      HTTP_STATUS_CODES.NOT_FOUND,
      `Hall '${hall}' does not exist`,
      error.cause,
    );
  }

  return new GeneralError(
    HTTP_STATUS_CODES.SERVER_ERROR,
    'Should not be possible',
    error.cause,
  );
}

function handlePossibleTicketDuplicationError(params: {
  error: unknown;
  row: number;
  column: number;
}) {
  const { error, row, column } = params;

  if (!isError(error)) {
    return new GeneralError(
      HTTP_STATUS_CODES.SERVER_ERROR,
      'Thrown a non error object',
    );
  }
  if (
    !isDatabaseError(error) ||
    error.code !== ERROR_CODES.POSTGRES.UNIQUE_VIOLATION
  ) {
    return error;
  }

  return new GeneralError(
    HTTP_STATUS_CODES.CONFLICT,
    `Seat at '[${row},${column}]' is already taken`,
    error.cause,
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
  type UserShowtime,
};
