import { Router, json } from 'express';

import * as authenticationController from './controller.ts';

/**********************************************************************************/

const router = Router()
  .post('/login', json({ limit: '16kb' }), authenticationController.login)
  .put(
    '/refresh',
    json({ limit: '16kb' }),
    authenticationController.refreshAccessToken,
  );

/**********************************************************************************/

export { router };
