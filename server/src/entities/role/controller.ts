import type { Request } from 'express';

import {
  HTTP_STATUS_CODES,
  type ResponseWithContext,
} from '../../utils/index.js';

import * as roleService from './service/index.js';
import * as roleValidator from './validator.js';

/**********************************************************************************/

async function getRoles(_req: Request, res: ResponseWithContext) {
  const roles = await roleService.getRoles(res.locals.context);

  res.status(HTTP_STATUS_CODES.SUCCESS).json(roles);
}

async function createRole(req: Request, res: ResponseWithContext) {
  const roleToCreate = roleValidator.validateCreateRole(req);

  const createdRole = await roleService.createRole(
    res.locals.context,
    roleToCreate,
  );

  res.status(HTTP_STATUS_CODES.CREATED).json(createdRole);
}

async function updateRole(req: Request, res: ResponseWithContext) {
  const roleToUpdate = roleValidator.validateUpdateRole(req);

  const updatedRole = await roleService.updateRole(
    res.locals.context,
    roleToUpdate,
  );

  res.status(HTTP_STATUS_CODES.SUCCESS).json(updatedRole);
}

async function deleteRole(req: Request, res: ResponseWithContext) {
  const roleId = roleValidator.validateDeleteRole(req);

  await roleService.deleteRole(res.locals.context, roleId);

  res.status(HTTP_STATUS_CODES.NO_CONTENT).end();
}

/**********************************************************************************/

export { createRole, deleteRole, getRoles, updateRole };
