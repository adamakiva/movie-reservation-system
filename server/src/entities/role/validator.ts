import type { Request } from 'express';

import { parseValidationResult, SCHEMAS } from '../utils.validator.ts';

/**********************************************************************************/

const { ROLE } = SCHEMAS;

/**********************************************************************************/

function validateCreateRole(req: Request) {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const { body } = req;

  const validatedResult = ROLE.CREATE.safeParse(body);
  const parsedValidatedResult = parseValidationResult(validatedResult);

  return parsedValidatedResult;
}

function validateUpdateRole(req: Request) {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const { body, params } = req;

  const validatedBodyResult = ROLE.UPDATE.BODY.safeParse(body);
  const { name } = parseValidationResult(validatedBodyResult);

  const validatedParamsResult = ROLE.UPDATE.PARAMS.safeParse(params);
  const { role_id: roleId } = parseValidationResult(validatedParamsResult);

  return {
    roleId,
    name,
  } as const;
}

function validateDeleteRole(req: Request) {
  const { params } = req;

  const validatedResult = ROLE.DELETE.safeParse(params);
  const { role_id: roleId } = parseValidationResult(validatedResult);

  return roleId;
}

/**********************************************************************************/

export { validateCreateRole, validateDeleteRole, validateUpdateRole };
