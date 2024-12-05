import { userController } from '../controllers/index.js';
import type { AuthenticationManager } from '../server/index.js';
import { Router, json } from '../utils/index.js';

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
      '/users/:userId',
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
      '/users/:userId',
      json({ limit: '8kb' }),
      authentication.httpAuthenticationMiddleware(),
      userController.updateUser,
    )
    .delete(
      '/users/:userId',
      json({ limit: 0 }),
      authentication.httpAuthenticationMiddleware(),
      userController.deleteUser,
    );

  return router;
}

/**********************************************************************************/

export { router };
