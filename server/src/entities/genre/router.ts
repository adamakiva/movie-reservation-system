import { Router, json } from 'express';

import type { AuthenticationManager } from '../../server/services/index.ts';

import * as genreController from './controller.ts';

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
      '/genres/:genre_id',
      json({ limit: '4kb' }),
      authentication.httpAuthenticationMiddleware(),
      genreController.updateGenre,
    )
    .delete(
      '/genres/:genre_id',
      json({ limit: 0 }),
      authentication.httpAuthenticationMiddleware(),
      genreController.deleteGenre,
    );

  return router;
}

/**********************************************************************************/

export { router };
