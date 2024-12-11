import {
  HTTP_STATUS_CODES,
  type Request,
  type ResponseWithCtx,
} from '../../utils/index.js';

import * as userService from './service/index.js';
import * as userValidator from './validator.js';

/**********************************************************************************/

async function getUsers(req: Request, res: ResponseWithCtx) {
  const pagination = userValidator.validateGetUsers(req);

  const users = await userService.getUsers(res.locals.context, pagination);

  res.status(HTTP_STATUS_CODES.SUCCESS).json(users);
}

async function getUser(req: Request, res: ResponseWithCtx) {
  const userId = userValidator.validateGetUser(req);

  const user = await userService.getUser(res.locals.context, userId);

  res.status(HTTP_STATUS_CODES.SUCCESS).json(user);
}

async function createUser(req: Request, res: ResponseWithCtx) {
  const userToCreate = userValidator.validateCreateUser(req);

  const createdUser = await userService.createUser(
    res.locals.context,
    userToCreate,
  );

  res.status(HTTP_STATUS_CODES.CREATED).json(createdUser);
}

async function updateUser(req: Request, res: ResponseWithCtx) {
  const userToUpdate = userValidator.validateUpdateUser(req);

  const updatedUser = await userService.updateUser(
    res.locals.context,
    userToUpdate,
  );

  res.status(HTTP_STATUS_CODES.SUCCESS).json(updatedUser);
}

async function deleteUser(req: Request, res: ResponseWithCtx) {
  const userId = userValidator.validateDeleteUser(req);

  await userService.deleteUser(res.locals.context, userId);

  res.status(HTTP_STATUS_CODES.NO_CONTENT).end();
}

/**********************************************************************************/

export { createUser, deleteUser, getUser, getUsers, updateUser };
