import { Router, json } from 'express';

import * as showtimeController from './controller.ts';

/**********************************************************************************/

const router = Router()
  .get('/showtimes', showtimeController.getShowtimes)
  .post('/showtimes', json({ limit: '4kb' }), showtimeController.createShowtime)
  .delete('/showtimes/:showtime_id', showtimeController.deleteShowtime)
  .post(
    '/showtimes/reserve-ticket',
    json({ limit: '4kb' }),
    showtimeController.reserveShowtimeTicket,
  )
  .delete(
    '/showtimes/cancel-reservation/:showtime_id',
    showtimeController.cancelUserShowtimeReservation,
  )
  .get('/showtimes/reservations/:user_id', showtimeController.getUserShowtimes);

/**********************************************************************************/

export default router;
