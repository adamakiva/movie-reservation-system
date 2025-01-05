import type {
  AuthenticationManager,
  FileManager,
} from '../../server/services/index.js';
import { Router, json } from '../../utils/index.js';

import * as movieController from './controller.js';

/**********************************************************************************/

function router(
  authentication: AuthenticationManager,
  fileManager: FileManager,
) {
  const router = Router()
    .get(
      '/movies',
      json({ limit: 0 }),
      authentication.httpAuthenticationMiddleware(),
      movieController.getMovies,
    )
    .get(
      '/movies/:movie_id',
      json({ limit: 0 }),
      authentication.httpAuthenticationMiddleware(),
      movieController.getMovie,
    )
    .get(
      '/movies/poster/:movie_id',
      json({ limit: 0 }),
      authentication.httpAuthenticationMiddleware(),
      movieController.getMoviePoster,
    )
    .post(
      '/movies',
      json({ limit: '4mb' }),
      authentication.httpAuthenticationMiddleware(),
      fileManager.single('poster'),
      movieController.createMovie,
    )
    .put(
      '/movies/:movie_id',
      json({ limit: '4mb' }),
      authentication.httpAuthenticationMiddleware(),
      fileManager.single('poster'),
      movieController.updateMovie,
    )
    .delete(
      '/movies/:movie_id',
      json({ limit: 0 }),
      authentication.httpAuthenticationMiddleware(),
      movieController.deleteMovie,
    );

  return router;
}

/**********************************************************************************/

export { router };
