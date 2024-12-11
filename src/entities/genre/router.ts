import type { AuthenticationManager } from '../../server/services/index.js';
import { Router, json } from '../../utils/index.js';

import * as genreController from './controller.js';

/**********************************************************************************/

function router(authentication: AuthenticationManager) {
  const router = Router()
    .get(
      '/genres',
      json({ limit: 0 }),
      authentication.httpAuthenticationMiddleware(),
      genreController.getGenres,
    )
    .post(
      '/genres',
      json({ limit: '4kb' }),
      authentication.httpAuthenticationMiddleware(),
      genreController.createGenre,
    )
    .put(
      '/genres/:genreId',
      json({ limit: '4kb' }),
      authentication.httpAuthenticationMiddleware(),
      genreController.updateGenre,
    )
    .delete(
      '/genres/:genreId',
      json({ limit: 0 }),
      authentication.httpAuthenticationMiddleware(),
      genreController.deleteGenre,
    );

  return router;
}

/**********************************************************************************/

export { router };
