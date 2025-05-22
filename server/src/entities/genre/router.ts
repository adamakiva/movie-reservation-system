import { Router, json } from 'express';

import { isAdmin } from '../../server/middlewares/index.ts';

import * as genreController from './controller.ts';

/**********************************************************************************/

function router(adminRoleId: string) {
  return Router()
    .get('/genres', genreController.getGenres)
    .post(
      '/genres',
      isAdmin(adminRoleId),
      json({ limit: '4kb' }),
      genreController.createGenre,
    )
    .put(
      '/genres/:genre_id',
      isAdmin(adminRoleId),
      json({ limit: '4kb' }),
      genreController.updateGenre,
    )
    .delete(
      '/genres/:genre_id',
      isAdmin(adminRoleId),
      genreController.deleteGenre,
    );
}

/**********************************************************************************/

export { router };
