import { HTTP_STATUS_CODES } from '@adamakiva/movie-reservation-system-shared';
import type { Request } from 'express';

import type { ResponseWithContext } from '../../utils/types.ts';

import * as showtimeService from './service/index.ts';
import * as showtimeValidator from './validator.ts';

/**********************************************************************************/

async function getShowtimes(request: Request, response: ResponseWithContext) {
  const pagination = showtimeValidator.validateGetShowtimes(request);

  const showtimes = await showtimeService.getShowtimes(
    response.locals.context,
    pagination,
  );

  response.status(HTTP_STATUS_CODES.SUCCESS).json(showtimes);
}

async function getUserShowtimes(
  request: Request,
  response: ResponseWithContext,
) {
  const pagination = showtimeValidator.validateGetUserShowtimes(request);

  const userShowtimes = await showtimeService.getUserShowtimes(
    response.locals.context,
    pagination,
  );

  response.status(HTTP_STATUS_CODES.SUCCESS).json(userShowtimes);
}

async function createShowtime(request: Request, response: ResponseWithContext) {
  const showtimeToCreate = showtimeValidator.validateCreateShowtime(request);

  const createdShowtime = await showtimeService.createShowtime(
    response.locals.context,
    showtimeToCreate,
  );

  response.status(HTTP_STATUS_CODES.CREATED).json(createdShowtime);
}

async function reserveShowtimeTicket(
  request: Request,
  response: ResponseWithContext,
) {
  const showtimeTicket =
    showtimeValidator.validateReserveShowtimeTicket(request);

  await showtimeService.reserveShowtimeTicket({
    request,
    context: response.locals.context,
    showtimeTicket,
  });

  response.status(HTTP_STATUS_CODES.ACCEPTED).end();
}

async function deleteShowtime(request: Request, response: ResponseWithContext) {
  const showtimeId = showtimeValidator.validateDeleteShowtime(request);

  await showtimeService.deleteShowtime(response.locals.context, showtimeId);

  response.status(HTTP_STATUS_CODES.ACCEPTED).end();
}

async function cancelUserShowtimeReservation(
  request: Request,
  response: ResponseWithContext,
) {
  const showtimeId =
    showtimeValidator.validateCancelUserShowtimeReservation(request);

  await showtimeService.cancelUserShowtimeReservation({
    request,
    context: response.locals.context,
    showtimeId,
  });

  response.status(HTTP_STATUS_CODES.ACCEPTED).end();
}

/**********************************************************************************/

export {
  cancelUserShowtimeReservation,
  createShowtime,
  deleteShowtime,
  getShowtimes,
  getUserShowtimes,
  reserveShowtimeTicket,
};
