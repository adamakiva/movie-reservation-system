import { Router, json } from 'express';

import * as genreController from './controller.ts';

/**********************************************************************************/

const router = Router()
  .get('/genres', genreController.getGenres)
  .post('/genres', json({ limit: '4kb' }), genreController.createGenre)
  .put('/genres/:genre_id', json({ limit: '4kb' }), genreController.updateGenre)
  .delete('/genres/:genre_id', genreController.deleteGenre);

/**********************************************************************************/

export default router;
