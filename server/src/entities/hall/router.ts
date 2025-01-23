import { Router, json } from 'express';

import type { AuthenticationManager } from '../../server/services/index.js';

import * as hallController from './controller.js';

/**********************************************************************************/

function router(authentication: AuthenticationManager) {
  const router = Router()
    .get(
      '/halls',
      json({ limit: 0 }),
      authentication.httpAuthenticationMiddleware(),
      hallController.getHalls,
    )
    .post(
      '/halls',
      json({ limit: '4kb' }),
      authentication.httpAuthenticationMiddleware(),
      hallController.createHall,
    )
    .put(
      '/halls/:hall_id',
      json({ limit: '4kb' }),
      authentication.httpAuthenticationMiddleware(),
      hallController.updateHall,
    )
    .delete(
      '/halls/:hall_id',
      json({ limit: 0 }),
      authentication.httpAuthenticationMiddleware(),
      hallController.deleteHall,
    );

  return router;
}

/**********************************************************************************/

export { router };
