import { Router, json } from 'express';

import { isAdmin, isSameUserOrAdmin } from '../../server/middlewares/index.ts';

import * as showtimeController from './controller.ts';

/**********************************************************************************/

function router(adminRoleId: string) {
  return Router()
    .get('/showtimes', isAdmin(adminRoleId), showtimeController.getShowtimes)
    .get(
      '/showtimes/reservations/:user_id',
      isSameUserOrAdmin(adminRoleId),
      showtimeController.getUserShowtimes,
    )
    .post(
      '/showtimes',
      isAdmin(adminRoleId),
      json({ limit: '4kb' }),
      showtimeController.createShowtime,
    )
    .post(
      '/showtimes/reserve-ticket',
      isSameUserOrAdmin(adminRoleId),
      json({ limit: '4kb' }),
      showtimeController.reserveShowtimeTicket,
    )
    .delete(
      '/showtimes/:showtime_id',
      isAdmin(adminRoleId),
      showtimeController.deleteShowtime,
    )
    .delete(
      '/showtimes/cancel-reservation/:user_id/:showtime_id',
      isSameUserOrAdmin(adminRoleId),
      showtimeController.cancelUserShowtimeReservation,
    );
}

/**********************************************************************************/

export { router };
