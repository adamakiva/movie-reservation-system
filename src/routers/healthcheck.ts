import { healthcheckController } from '../controllers/index.js';
import { Router, json } from '../utils/index.js';

/**********************************************************************************/

// No body parser, because these requests should not have a body
const router = Router()
  .head('/alive', json({ limit: 0 }), healthcheckController.livenessHealthCheck)
  .get('/alive', json({ limit: 0 }), healthcheckController.livenessHealthCheck)
  .head(
    '/ready',
    json({ limit: 0 }),
    healthcheckController.readinessHealthCheck,
  )
  .get(
    '/ready',
    json({ limit: 0 }),
    healthcheckController.readinessHealthCheck,
  );

/**********************************************************************************/

export { router };
