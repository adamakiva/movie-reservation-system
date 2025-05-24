import { HTTP_STATUS_CODES } from '@adamakiva/movie-reservation-system-shared';
import type { Request, Response } from 'express';

import * as showtimeService from './service/index.ts';
import * as showtimeValidator from './validator.ts';

/**********************************************************************************/

async function getShowtimes(request: Request, response: Response) {
  const pagination = showtimeValidator.validateGetShowtimes(request);

  const showtimes = await showtimeService.getShowtimes(
    request.app.locals,
    pagination,
  );

  response.status(HTTP_STATUS_CODES.SUCCESS).json(showtimes);
}

async function getUserShowtimes(request: Request, response: Response) {
  const pagination = showtimeValidator.validateGetUserShowtimes(request);

  const userShowtimes = await showtimeService.getUserShowtimes(
    request.app.locals,
    pagination,
  );

  response.status(HTTP_STATUS_CODES.SUCCESS).json(userShowtimes);
}

async function createShowtime(request: Request, response: Response) {
  const showtimeToCreate = showtimeValidator.validateCreateShowtime(request);

  const createdShowtime = await showtimeService.createShowtime(
    request.app.locals,
    showtimeToCreate,
  );

  response.status(HTTP_STATUS_CODES.CREATED).json(createdShowtime);
}

async function reserveShowtimeTicket(request: Request, response: Response) {
  const showtimeTicket =
    showtimeValidator.validateReserveShowtimeTicket(request);

  await showtimeService.reserveShowtimeTicket({
    request,
    context: request.app.locals,
    showtimeTicket,
  });

  response.status(HTTP_STATUS_CODES.ACCEPTED).end();
}

async function deleteShowtime(request: Request, response: Response) {
  const { showtimeId } = showtimeValidator.validateDeleteShowtime(request);

  await showtimeService.deleteShowtime(request.app.locals, showtimeId);

  response.status(HTTP_STATUS_CODES.ACCEPTED).end();
}

async function cancelUserShowtimeReservation(
  request: Request,
  response: Response,
) {
  const { showtimeId } =
    showtimeValidator.validateCancelUserShowtimeReservation(request);

  await showtimeService.cancelUserShowtimeReservation({
    request,
    context: request.app.locals,
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
