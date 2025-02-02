import { Router, json } from 'express';

import type { AuthenticationManager } from '../../server/services/index.js';

import * as userController from './controller.js';

/**********************************************************************************/

function router(authentication: AuthenticationManager) {
  const router = Router()
    .get(
      '/users',
      json({ limit: 0 }),
      authentication.httpAuthenticationMiddleware(),
      userController.getUsers,
    )
    .get(
      '/users/:user_id',
      json({ limit: 0 }),
      authentication.httpAuthenticationMiddleware(),
      userController.getUser,
    )
    .post(
      '/users',
      json({ limit: '8kb' }),
      authentication.httpAuthenticationMiddleware(),
      userController.createUser,
    )
    .put(
      '/users/:user_id',
      json({ limit: '8kb' }),
      authentication.httpAuthenticationMiddleware(),
      userController.updateUser,
    )
    .delete(
      '/users/:user_id',
      json({ limit: 0 }),
      authentication.httpAuthenticationMiddleware(),
      userController.deleteUser,
    );

  return router;
}

/**********************************************************************************/

export { router };
