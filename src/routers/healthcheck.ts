import { healthcheckController } from '../controllers/index.js';
import { Router } from '../utils/index.js';

/**********************************************************************************/

// No body parser, because these requests should not have a body
const router = Router()
  .head('/alive', healthcheckController.livenessHealthCheck)
  .get('/alive', healthcheckController.livenessHealthCheck)
  .head('/ready', healthcheckController.readinessHealthCheck)
  .get('/ready', healthcheckController.readinessHealthCheck);

/**********************************************************************************/

export { router };
