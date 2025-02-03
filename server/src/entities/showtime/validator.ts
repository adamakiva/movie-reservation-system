import type { Request } from 'express';

import { parseValidationResult, SCHEMAS } from '../utils.validator.ts';

/**********************************************************************************/

const { SHOWTIME } = SCHEMAS;

/**********************************************************************************/

function validateGetShowtimes(req: Request) {
  const { query } = req;

  const validatedResult = SHOWTIME.READ.safeParse(query);
  const parsedValidatedResult = parseValidationResult(validatedResult);

  return parsedValidatedResult;
}

function validateCreateShowtime(req: Request) {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const { body } = req;

  const validatedResult = SHOWTIME.CREATE.safeParse(body);
  const parsedValidatedResult = parseValidationResult(validatedResult);

  return parsedValidatedResult;
}

function validateDeleteShowtime(req: Request) {
  const { params } = req;

  const validatedResult = SHOWTIME.DELETE.safeParse(params);
  const { showtime_id: showtimeId } = parseValidationResult(validatedResult);

  return showtimeId;
}

function validateReserveShowtimeTicket(req: Request) {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const { body } = req;

  const validatedResult = SHOWTIME.RESERVER.safeParse(body);
  const {
    showtime_id: showtimeId,
    row,
    column,
  } = parseValidationResult(validatedResult);

  return {
    showtimeId,
    row,
    column,
  } as const;
}

function validateCancelUserShowtimeReservation(req: Request) {
  const { params } = req;

  const validatedResult = SHOWTIME.CANCEL.safeParse(params);
  const { showtime_id: showtimeId } = parseValidationResult(validatedResult);

  return showtimeId;
}

function validateGetUserShowtimes(req: Request) {
  const { params, query } = req;

  const validatedParamsResult = SHOWTIME.USER.READ.PARAMS.safeParse(params);
  const { user_id: userId } = parseValidationResult(validatedParamsResult);
  const validatedQueryResult = SHOWTIME.USER.READ.QUERY.safeParse(query);
  const { cursor, pageSize } = parseValidationResult(validatedQueryResult);

  return {
    userId,
    cursor,
    pageSize,
  } as const;
}

/**********************************************************************************/

export {
  validateCancelUserShowtimeReservation,
  validateCreateShowtime,
  validateDeleteShowtime,
  validateGetShowtimes,
  validateGetUserShowtimes,
  validateReserveShowtimeTicket,
};
