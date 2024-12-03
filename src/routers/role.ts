import { roleController } from '../controllers/index.js';
import type { AuthenticationManager } from '../server/index.js';
import { Router, json } from '../utils/index.js';

/**********************************************************************************/

function router(authentication: AuthenticationManager) {
  return Router()
    .get(
      '/roles',
      json({ limit: 0 }),
      authentication.httpAuthenticationMiddleware.bind(authentication),
      roleController.getRoles,
    )
    .post(
      '/roles',
      json({ limit: '4kb' }),
      authentication.httpAuthenticationMiddleware.bind(authentication),
      roleController.createRole,
    )
    .put(
      '/roles/:roleId',
      json({ limit: '4kb' }),
      authentication.httpAuthenticationMiddleware.bind(authentication),
      roleController.updateRole,
    )
    .delete(
      '/roles/:roleId',
      json({ limit: 0 }),
      authentication.httpAuthenticationMiddleware.bind(authentication),
      roleController.deleteRole,
    );
}

/**********************************************************************************/

export { router };
