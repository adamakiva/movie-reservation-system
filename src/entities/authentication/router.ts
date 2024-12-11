import { Router, json } from '../../utils/index.js';

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
