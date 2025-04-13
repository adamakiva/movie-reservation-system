import { Router, json } from 'express';

import * as userController from './controller.ts';

/**********************************************************************************/

const router = Router()
  .get('/users', userController.getUsers)
  .get('/users/:user_id', userController.getUser)
  .post('/users', json({ limit: '8kb' }), userController.createUser)
  .put('/users/:user_id', json({ limit: '8kb' }), userController.updateUser)
  .delete('/users/:user_id', userController.deleteUser);

/**********************************************************************************/

export { router };
