import type { AuthenticationManager } from '../../server/services/index.js';
import { Router, json } from '../../utils/index.js';

import * as showtimeController from './controller.js';

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
    );

  return router;
}

/**********************************************************************************/

export { router };
