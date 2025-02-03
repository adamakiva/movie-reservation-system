import type { Request } from 'express';

import {
  HTTP_STATUS_CODES,
  type ResponseWithContext,
} from '../../utils/index.ts';

import * as showtimeService from './service/index.ts';
import * as showtimeValidator from './validator.ts';

/**********************************************************************************/

async function getShowtimes(req: Request, res: ResponseWithContext) {
  const pagination = showtimeValidator.validateGetShowtimes(req);

  const showtimes = await showtimeService.getShowtimes(
    res.locals.context,
    pagination,
  );

  res.status(HTTP_STATUS_CODES.SUCCESS).json(showtimes);
}

async function createShowtime(req: Request, res: ResponseWithContext) {
  const showtimeToCreate = showtimeValidator.validateCreateShowtime(req);

  const createdShowtime = await showtimeService.createShowtime(
    res.locals.context,
    showtimeToCreate,
  );

  res.status(HTTP_STATUS_CODES.CREATED).json(createdShowtime);
}

async function deleteShowtime(req: Request, res: ResponseWithContext) {
  const showtimeId = showtimeValidator.validateDeleteShowtime(req);

  await showtimeService.deleteShowtime(res.locals.context, showtimeId);

  res.status(HTTP_STATUS_CODES.NO_CONTENT).end();
}

async function reserveShowtimeTicket(req: Request, res: ResponseWithContext) {
  const showtimeTicket = showtimeValidator.validateReserveShowtimeTicket(req);

  const createdShowtimeTicket = await showtimeService.reserveShowtimeTicket({
    req,
    context: res.locals.context,
    showtimeTicket,
  });

  res.status(HTTP_STATUS_CODES.CREATED).json(createdShowtimeTicket);
}

async function cancelUserShowtimeReservation(
  req: Request,
  res: ResponseWithContext,
) {
  const showtimeId =
    showtimeValidator.validateCancelUserShowtimeReservation(req);

  await showtimeService.cancelUserShowtimeReservation({
    req,
    context: res.locals.context,
    showtimeId,
  });

  res.status(HTTP_STATUS_CODES.NO_CONTENT).end();
}

async function getUserShowtimes(req: Request, res: ResponseWithContext) {
  const pagination = showtimeValidator.validateGetUserShowtimes(req);

  const userShowtimes = await showtimeService.getUserShowtimes(
    res.locals.context,
    pagination,
  );

  res.status(HTTP_STATUS_CODES.SUCCESS).json(userShowtimes);
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
