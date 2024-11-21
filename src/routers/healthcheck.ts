import { Router } from 'express';
import { healthcheckController } from '../controllers/index.js';

/**********************************************************************************/

const router = Router()
  .head('/alive', healthcheckController.livenessHealthCheck)
  .get('/alive', healthcheckController.livenessHealthCheck)
  .head('/ready', healthcheckController.readinessHealthCheck)
  .get('/ready', healthcheckController.readinessHealthCheck);

/**********************************************************************************/

export { router };
