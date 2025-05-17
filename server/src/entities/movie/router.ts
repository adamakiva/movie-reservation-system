import { Router, json } from 'express';

import type { FileManager } from '../../server/services/index.ts';

import * as movieController from './controller.ts';

/**********************************************************************************/

function router(fileManager: FileManager) {
  const router = Router()
    .get('/movies', movieController.getMovies)
    .get('/movies/:movie_id', movieController.getMovie)
    .get('/movies/poster/:movie_id', movieController.getMoviePoster)
    .post(
      '/movies',
      json({ limit: '4mb' }),
      fileManager.processSingleFileMiddleware('poster'),
      movieController.createMovie,
    )
    .put(
      '/movies/:movie_id',
      json({ limit: '4mb' }),
      fileManager.processSingleFileMiddleware('poster'),
      movieController.updateMovie,
    )
    .delete('/movies/:movie_id', movieController.deleteMovie);

  return router;
}

/**********************************************************************************/

export { router };
