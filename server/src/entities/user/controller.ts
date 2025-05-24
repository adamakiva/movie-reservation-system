import { HTTP_STATUS_CODES } from '@adamakiva/movie-reservation-system-shared';
import type { Request, Response } from 'express';

import * as userService from './service/index.ts';
import * as userValidator from './validator.ts';

/**********************************************************************************/

async function getUsers(request: Request, response: Response) {
  const pagination = userValidator.validateGetUsers(request);

  const users = await userService.getUsers(request.app.locals, pagination);

  response.status(HTTP_STATUS_CODES.SUCCESS).json(users);
}

async function getUser(request: Request, response: Response) {
  const { userId } = userValidator.validateGetUser(request);

  const user = await userService.getUser(request.app.locals, userId);

  response.status(HTTP_STATUS_CODES.SUCCESS).json(user);
}

async function createUser(request: Request, response: Response) {
  const userToCreate = userValidator.validateCreateUser(request);

  const createdUser = await userService.createUser(
    request.app.locals,
    userToCreate,
  );

  response.status(HTTP_STATUS_CODES.CREATED).json(createdUser);
}

async function updateUser(request: Request, response: Response) {
  const userToUpdate = userValidator.validateUpdateUser(request);

  const updatedUser = await userService.updateUser(
    request.app.locals,
    userToUpdate,
  );

  response.status(HTTP_STATUS_CODES.SUCCESS).json(updatedUser);
}

async function deleteUser(request: Request, response: Response) {
  const { userId } = userValidator.validateDeleteUser(request);

  await userService.deleteUser(request.app.locals, userId);

  response.status(HTTP_STATUS_CODES.NO_CONTENT).end();
}

/**********************************************************************************/

export { createUser, deleteUser, getUser, getUsers, updateUser };
