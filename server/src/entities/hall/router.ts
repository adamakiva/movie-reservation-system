import { Router, json } from 'express';

import { isAdmin } from '../../server/middlewares/index.ts';

import * as hallController from './controller.ts';

/**********************************************************************************/

function router(adminRoleId: string) {
  return Router()
    .get('/halls', hallController.getHalls)
    .post(
      '/halls',
      json({ limit: '4kb' }),
      isAdmin(adminRoleId),
      hallController.createHall,
    )
    .put(
      '/halls/:hall_id',
      json({ limit: '4kb' }),
      isAdmin(adminRoleId),
      hallController.updateHall,
    )
    .delete('/halls/:hall_id', isAdmin(adminRoleId), hallController.deleteHall);
}

/**********************************************************************************/

export { router };
