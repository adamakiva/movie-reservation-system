import { Router } from 'express';
import { authenticationController } from '../controllers/index.js';

/**********************************************************************************/

const router = Router().put('/login', authenticationController.login);

/**********************************************************************************/

export { router };
