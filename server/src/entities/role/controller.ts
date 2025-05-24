import { HTTP_STATUS_CODES } from '@adamakiva/movie-reservation-system-shared';
import type { Request, Response } from 'express';

import * as roleService from './service/index.ts';
import * as roleValidator from './validator.ts';

/**********************************************************************************/

async function getRoles(request: Request, response: Response) {
  const roles = await roleService.getRoles(request.app.locals);

  response.status(HTTP_STATUS_CODES.SUCCESS).json(roles);
}

async function createRole(request: Request, response: Response) {
  const roleToCreate = roleValidator.validateCreateRole(request);

  const createdRole = await roleService.createRole(
    request.app.locals,
    roleToCreate,
  );

  response.status(HTTP_STATUS_CODES.CREATED).json(createdRole);
}

async function updateRole(request: Request, response: Response) {
  const roleToUpdate = roleValidator.validateUpdateRole(request);

  const updatedRole = await roleService.updateRole(
    request.app.locals,
    roleToUpdate,
  );

  response.status(HTTP_STATUS_CODES.SUCCESS).json(updatedRole);
}

async function deleteRole(request: Request, response: Response) {
  const { roleId } = roleValidator.validateDeleteRole(request);

  await roleService.deleteRole(request.app.locals, roleId);

  response.status(HTTP_STATUS_CODES.NO_CONTENT).end();
}

/**********************************************************************************/

export { createRole, deleteRole, getRoles, updateRole };
