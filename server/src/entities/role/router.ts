import { Router, json } from 'express';

import { isAdmin } from '../../server/middlewares/index.ts';

import * as roleController from './controller.ts';

/**********************************************************************************/

function router(adminRoleId: string) {
  return Router()
    .get('/roles', roleController.getRoles)
    .post(
      '/roles',
      json({ limit: '4kb' }),
      isAdmin(adminRoleId),
      roleController.createRole,
    )
    .put(
      '/roles/:role_id',
      json({ limit: '4kb' }),
      isAdmin(adminRoleId),
      roleController.updateRole,
    )
    .delete('/roles/:role_id', isAdmin(adminRoleId), roleController.deleteRole);
}

/**********************************************************************************/

export { router };
