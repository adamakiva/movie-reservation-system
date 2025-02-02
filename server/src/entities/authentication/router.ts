import { Router, json } from 'express';

import * as authenticationController from './controller.js';

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
