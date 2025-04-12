import { Router, json } from 'express';

import * as roleController from './controller.ts';

/**********************************************************************************/

const router = Router()
  .get('/roles', roleController.getRoles)
  .post('/roles', json({ limit: '4kb' }), roleController.createRole)
  .put('/roles/:role_id', json({ limit: '4kb' }), roleController.updateRole)
  .delete('/roles/:role_id', roleController.deleteRole);

/**********************************************************************************/

export default router;
