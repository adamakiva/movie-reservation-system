import { type Request, HTTP_STATUS_CODES } from '../../utils/index.js';

import {
  createRoleSchema,
  deleteRoleSchema,
  parseValidationResult,
  updateRoleBodySchema,
  updateRoleParamsSchema,
} from '../utils.validator.js';

/**********************************************************************************/

function validateCreateRole(req: Request) {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const { body } = req;

  const validatedResult = createRoleSchema.safeParse(body);
  const parsedValidatedResult = parseValidationResult(
    validatedResult,
    HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
  );

  return parsedValidatedResult;
}

function validateUpdateRole(req: Request) {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const { body, params } = req;

  const validatedBodyResult = updateRoleBodySchema.safeParse(body);
  const { name } = parseValidationResult(
    validatedBodyResult,
    HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
  );

  const validatedParamsResult = updateRoleParamsSchema.safeParse(params);
  const { roleId } = parseValidationResult(
    validatedParamsResult,
    HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
  );

  return {
    roleId,
    name,
  } as const;
}

function validateDeleteRole(req: Request) {
  const { params } = req;

  const validatedResult = deleteRoleSchema.safeParse(params);
  const { roleId } = parseValidationResult(
    validatedResult,
    HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
  );

  return roleId;
}

/**********************************************************************************/

export { validateCreateRole, validateDeleteRole, validateUpdateRole };
