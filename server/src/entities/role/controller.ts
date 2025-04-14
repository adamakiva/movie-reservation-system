import { HTTP_STATUS_CODES } from '@adamakiva/movie-reservation-system-shared';
import type { Request } from 'express';

import type { ResponseWithContext } from '../../utils/index.ts';

import * as roleService from './service/index.ts';
import * as roleValidator from './validator.ts';

/**********************************************************************************/

async function getRoles(_: Request, response: ResponseWithContext) {
  const roles = await roleService.getRoles(response.locals.context);

  response.status(HTTP_STATUS_CODES.SUCCESS).json(roles);
}

async function createRole(req: Request, response: ResponseWithContext) {
  const roleToCreate = roleValidator.validateCreateRole(req);

  const createdRole = await roleService.createRole(
    response.locals.context,
    roleToCreate,
  );

  response.status(HTTP_STATUS_CODES.CREATED).json(createdRole);
}

async function updateRole(req: Request, response: ResponseWithContext) {
  const roleToUpdate = roleValidator.validateUpdateRole(req);

  const updatedRole = await roleService.updateRole(
    response.locals.context,
    roleToUpdate,
  );

  response.status(HTTP_STATUS_CODES.SUCCESS).json(updatedRole);
}

async function deleteRole(req: Request, response: ResponseWithContext) {
  const roleId = roleValidator.validateDeleteRole(req);

  await roleService.deleteRole(response.locals.context, roleId);

  response.status(HTTP_STATUS_CODES.NO_CONTENT).end();
}

/**********************************************************************************/

export { createRole, deleteRole, getRoles, updateRole };
