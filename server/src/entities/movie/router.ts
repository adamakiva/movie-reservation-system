import { Router, json } from 'express';

import { isAdmin } from '../../server/middlewares/index.ts';
import type { FileManager } from '../../server/services/index.ts';

import * as movieController from './controller.ts';

/**********************************************************************************/

function router(fileManager: FileManager, adminRoleId: string) {
  const router = Router()
    .get('/movies', movieController.getMovies)
    .get('/movies/:movie_id', movieController.getMovie)
    .get('/movies/poster/:movie_id', movieController.getMoviePoster)
    .post(
      '/movies',
      isAdmin(adminRoleId),
      json({ limit: '4mb' }),
      fileManager.processSingleFileMiddleware('poster'),
      movieController.createMovie,
    )
    .put(
      '/movies/:movie_id',
      isAdmin(adminRoleId),
      json({ limit: '4mb' }),
      fileManager.processSingleFileMiddleware('poster'),
      movieController.updateMovie,
    )
    .delete(
      '/movies/:movie_id',
      isAdmin(adminRoleId),
      movieController.deleteMovie,
    );

  return router;
}

/**********************************************************************************/

export { router };
