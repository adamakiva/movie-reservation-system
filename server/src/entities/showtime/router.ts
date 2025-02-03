import { Router, json } from 'express';

import type { AuthenticationManager } from '../../server/services/index.ts';

import * as showtimeController from './controller.ts';

/**********************************************************************************/

function router(authentication: AuthenticationManager) {
  const router = Router()
    .get(
      '/showtimes',
      json({ limit: 0 }),
      authentication.httpAuthenticationMiddleware(),
      showtimeController.getShowtimes,
    )
    .post(
      '/showtimes',
      json({ limit: '4kb' }),
      authentication.httpAuthenticationMiddleware(),
      showtimeController.createShowtime,
    )
    .delete(
      '/showtimes/:showtime_id',
      json({ limit: 0 }),
      authentication.httpAuthenticationMiddleware(),
      showtimeController.deleteShowtime,
    )
    .post(
      '/showtimes/reserve-ticket',
      json({ limit: '4kb' }),
      authentication.httpAuthenticationMiddleware(),
      showtimeController.reserveShowtimeTicket,
    )
    .delete(
      '/showtimes/cancel-reservation/:showtime_id',
      json({ limit: 0 }),
      authentication.httpAuthenticationMiddleware(),
      showtimeController.cancelUserShowtimeReservation,
    )
    .get(
      '/showtimes/reservations/:user_id',
      json({ limit: 0 }),
      authentication.httpAuthenticationMiddleware(),
      showtimeController.getUserShowtimes,
    );

  return router;
}

/**********************************************************************************/

export { router };
