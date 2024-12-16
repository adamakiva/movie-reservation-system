import type {
  AuthenticationManager,
  FileParser,
} from '../../server/services/index.js';
import { Router, json } from '../../utils/index.js';

import * as movieController from './controller.js';

/**********************************************************************************/

function router(authentication: AuthenticationManager, fileParser: FileParser) {
  const router = Router()
    .get(
      '/movies',
      json({ limit: 0 }),
      authentication.httpAuthenticationMiddleware(),
      movieController.getMovies,
    )
    .get(
      '/movies/:movieId',
      json({ limit: 0 }),
      authentication.httpAuthenticationMiddleware(),
      movieController.getMovie,
    )
    .post(
      '/movies',
      json({ limit: '4mb' }),
      authentication.httpAuthenticationMiddleware(),
      fileParser.single('poster'),
      movieController.createMovie,
    )
    .put(
      '/movies/:movieId',
      json({ limit: '4mb' }),
      authentication.httpAuthenticationMiddleware(),
      fileParser.single('poster'),
      movieController.updateMovie,
    )
    .delete(
      '/movies/:movieId',
      json({ limit: 0 }),
      authentication.httpAuthenticationMiddleware(),
      movieController.deleteMovie,
    );

  return router;
}

/**********************************************************************************/

export { router };
