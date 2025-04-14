import { Router } from 'express';

import * as healthcheckController from './controller.ts';

/**********************************************************************************/

const router = Router()
  .head('/alive', healthcheckController.livenessHealthCheck)
  .get('/alive', healthcheckController.livenessHealthCheck)
  .head('/ready', healthcheckController.readinessHealthCheck)
  .get('/ready', healthcheckController.readinessHealthCheck);

/**********************************************************************************/

export { router };
