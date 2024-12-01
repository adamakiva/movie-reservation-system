import { authenticationController } from '../controllers/index.js';
import { Router, json } from '../utils/index.js';

/**********************************************************************************/

const router = Router()
  .put('/login', json({ limit: '16kb' }), authenticationController.login)
  .put(
    '/refresh',
    json({ limit: '16kb' }),
    authenticationController.refreshAccessToken,
  );

/**********************************************************************************/

export { router };
