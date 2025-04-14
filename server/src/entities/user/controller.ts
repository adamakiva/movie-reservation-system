import { HTTP_STATUS_CODES } from '@adamakiva/movie-reservation-system-shared';
import type { Request } from 'express';

import type { ResponseWithContext } from '../../utils/index.ts';

import * as userService from './service/index.ts';
import * as userValidator from './validator.ts';

/**********************************************************************************/

async function getUsers(request: Request, response: ResponseWithContext) {
  const pagination = userValidator.validateGetUsers(request);

  const users = await userService.getUsers(response.locals.context, pagination);

  response.status(HTTP_STATUS_CODES.SUCCESS).json(users);
}

async function getUser(request: Request, response: ResponseWithContext) {
  const userId = userValidator.validateGetUser(request);

  const user = await userService.getUser(response.locals.context, userId);

  response.status(HTTP_STATUS_CODES.SUCCESS).json(user);
}

async function createUser(request: Request, response: ResponseWithContext) {
  const userToCreate = userValidator.validateCreateUser(request);

  const createdUser = await userService.createUser(
    response.locals.context,
    userToCreate,
  );

  response.status(HTTP_STATUS_CODES.CREATED).json(createdUser);
}

async function updateUser(request: Request, response: ResponseWithContext) {
  const userToUpdate = userValidator.validateUpdateUser(request);

  const updatedUser = await userService.updateUser(
    response.locals.context,
    userToUpdate,
  );

  response.status(HTTP_STATUS_CODES.SUCCESS).json(updatedUser);
}

async function deleteUser(request: Request, response: ResponseWithContext) {
  const userId = userValidator.validateDeleteUser(request);

  await userService.deleteUser(response.locals.context, userId);

  response.status(HTTP_STATUS_CODES.NO_CONTENT).end();
}

/**********************************************************************************/

export { createUser, deleteUser, getUser, getUsers, updateUser };
