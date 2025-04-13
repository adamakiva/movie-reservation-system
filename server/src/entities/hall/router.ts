import { Router, json } from 'express';

import * as hallController from './controller.ts';

/**********************************************************************************/

const router = Router()
  .get('/halls', hallController.getHalls)
  .post('/halls', json({ limit: '4kb' }), hallController.createHall)
  .put('/halls/:hall_id', json({ limit: '4kb' }), hallController.updateHall)
  .delete('/halls/:hall_id', hallController.deleteHall);

/**********************************************************************************/

export { router };
