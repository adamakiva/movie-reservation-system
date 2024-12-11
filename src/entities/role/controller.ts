import {
  HTTP_STATUS_CODES,
  type Request,
  type ResponseWithCtx,
} from '../../utils/index.js';

import * as roleService from './service/index.js';
import * as roleValidator from './validator.js';

/**********************************************************************************/

async function getRoles(_req: Request, res: ResponseWithCtx) {
  const roles = await roleService.getRoles(res.locals.context);

  res.status(HTTP_STATUS_CODES.SUCCESS).json(roles);
}

async function createRole(req: Request, res: ResponseWithCtx) {
  const roleToCreate = roleValidator.validateCreateRole(req);

  const createRole = await roleService.createRole(
    res.locals.context,
    roleToCreate,
  );

  res.status(HTTP_STATUS_CODES.CREATED).json(createRole);
}

async function updateRole(req: Request, res: ResponseWithCtx) {
  const roleToUpdate = roleValidator.validateUpdateRole(req);

  const updatedRole = await roleService.updateRole(
    res.locals.context,
    roleToUpdate,
  );

  res.status(HTTP_STATUS_CODES.SUCCESS).json(updatedRole);
}

async function deleteRole(req: Request, res: ResponseWithCtx) {
  const roleId = roleValidator.validateDeleteRole(req);

  await roleService.deleteRole(res.locals.context, roleId);

  res.status(HTTP_STATUS_CODES.NO_CONTENT).end();
}

/**********************************************************************************/

export { createRole, deleteRole, getRoles, updateRole };
