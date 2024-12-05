import { roleController } from '../controllers/index.js';
import type { AuthenticationManager } from '../server/index.js';
import { Router, json } from '../utils/index.js';

/**********************************************************************************/

function router(authentication: AuthenticationManager) {
  const router = Router()
    .get(
      '/roles',
      json({ limit: 0 }),
      authentication.httpAuthenticationMiddleware(),
      roleController.getRoles,
    )
    .post(
      '/roles',
      json({ limit: '4kb' }),
      authentication.httpAuthenticationMiddleware(),
      roleController.createRole,
    )
    .put(
      '/roles/:roleId',
      json({ limit: '4kb' }),
      authentication.httpAuthenticationMiddleware(),
      roleController.updateRole,
    )
    .delete(
      '/roles/:roleId',
      json({ limit: 0 }),
      authentication.httpAuthenticationMiddleware(),
      roleController.deleteRole,
    );

  return router;
}

/**********************************************************************************/

export { router };
