import { Router, json } from 'express';

import { isAdmin, isSameUserOrAdmin } from '../../server/middlewares/index.ts';

import * as userController from './controller.ts';

/**********************************************************************************/

function router(adminRoleId: string) {
  return Router()
    .get('/users', isAdmin(adminRoleId), userController.getUsers)
    .get(
      '/users/:user_id',
      isSameUserOrAdmin(adminRoleId),
      userController.getUser,
    )
    .post(
      '/users',
      json({ limit: '8kb' }),
      isAdmin(adminRoleId),
      userController.createUser,
    )
    .put(
      '/users/:user_id',
      isAdmin(adminRoleId),
      json({ limit: '8kb' }),
      userController.updateUser,
    )
    .delete('/users/:user_id', isAdmin(adminRoleId), userController.deleteUser);
}

/**********************************************************************************/

export { router };
