import { type Request, HTTP_STATUS_CODES } from '../utils/index.js';

import {
  createRoleSchema,
  deleteRoleSchema,
  parseValidationResult,
  updateRoleBodySchema,
  updateRoleParamsSchema,
} from './utils.js';

/**********************************************************************************/

function validateCreateRole(req: Request) {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const { body } = req;

  return parseValidationResult(
    createRoleSchema.safeParse(body),
    HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
  );
}

function validateUpdateRole(req: Request) {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const { body, params } = req;

  const { name } = parseValidationResult(
    updateRoleBodySchema.safeParse(body),
    HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
  );
  const { roleId } = parseValidationResult(
    updateRoleParamsSchema.safeParse(params),
    HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
  );

  return {
    roleId,
    name,
  };
}

function validateDeleteRole(req: Request) {
  const { params } = req;

  return parseValidationResult(
    deleteRoleSchema.safeParse(params),
    HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
  ).roleId;
}

/**********************************************************************************/

export { validateCreateRole, validateDeleteRole, validateUpdateRole };
