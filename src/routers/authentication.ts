import { Router } from 'express';
import { authenticationController } from '../controllers/index.js';

/**********************************************************************************/

const router = Router()
  .put('/login', authenticationController.login)
  .put('/refresh', authenticationController.refresh);

/**********************************************************************************/

export { router };
