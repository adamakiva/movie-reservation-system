import type { Request } from 'express';
import { ZodIssueCode, object as ZodObject, string as ZodString } from 'zod';

import { HTTP_STATUS_CODES } from '../../utils/index.js';

import { parseValidationResult, VALIDATION } from '../utils.validator.js';

/**********************************************************************************/

const { ROLE, PARAMS, BODY } = VALIDATION;

/**********************************************************************************/

const createRoleSchema = ZodObject(
  {
    id: ZodString({
      invalid_type_error: ROLE.ID.INVALID_TYPE_ERROR_MESSAGE,
    })
      .uuid(ROLE.ID.ERROR_MESSAGE)
      .optional(),
    name: ZodString({
      invalid_type_error: ROLE.NAME.INVALID_TYPE_ERROR_MESSAGE,
      required_error: ROLE.NAME.REQUIRED_ERROR_MESSAGE,
    })
      .min(ROLE.NAME.MIN_LENGTH.VALUE, ROLE.NAME.MIN_LENGTH.ERROR_MESSAGE)
      .max(ROLE.NAME.MAX_LENGTH.VALUE, ROLE.NAME.MAX_LENGTH.ERROR_MESSAGE)
      .toLowerCase(),
  },
  {
    invalid_type_error: BODY.INVALID_TYPE_ERROR_MESSAGE,
    required_error: BODY.REQUIRED_ERROR_MESSAGE,
  },
);

const updateRoleBodySchema = ZodObject(
  {
    name: ZodString({
      invalid_type_error: ROLE.NAME.INVALID_TYPE_ERROR_MESSAGE,
    })
      .min(ROLE.NAME.MIN_LENGTH.VALUE, ROLE.NAME.MIN_LENGTH.ERROR_MESSAGE)
      .max(ROLE.NAME.MAX_LENGTH.VALUE, ROLE.NAME.MAX_LENGTH.ERROR_MESSAGE)
      .toLowerCase()
      .optional(),
  },
  {
    invalid_type_error: BODY.INVALID_TYPE_ERROR_MESSAGE,
    required_error: BODY.REQUIRED_ERROR_MESSAGE,
  },
).superRefine((roleUpdates, context) => {
  if (!Object.keys(roleUpdates).length) {
    context.addIssue({
      code: ZodIssueCode.custom,
      message: ROLE.NO_FIELDS_TO_UPDATE_ERROR_MESSAGE,
      fatal: true,
    });
  }
});

const updateRoleParamsSchema = ZodObject(
  {
    role_id: ZodString({
      invalid_type_error: ROLE.ID.INVALID_TYPE_ERROR_MESSAGE,
      required_error: ROLE.ID.REQUIRED_ERROR_MESSAGE,
    }).uuid(ROLE.ID.ERROR_MESSAGE),
  },
  {
    invalid_type_error: PARAMS.INVALID_TYPE_ERROR_MESSAGE,
    required_error: PARAMS.REQUIRED_ERROR_MESSAGE,
  },
);

const deleteRoleSchema = ZodObject(
  {
    role_id: ZodString({
      invalid_type_error: ROLE.ID.INVALID_TYPE_ERROR_MESSAGE,
      required_error: ROLE.ID.REQUIRED_ERROR_MESSAGE,
    }).uuid(ROLE.ID.ERROR_MESSAGE),
  },
  {
    invalid_type_error: PARAMS.INVALID_TYPE_ERROR_MESSAGE,
    required_error: PARAMS.REQUIRED_ERROR_MESSAGE,
  },
);

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
  const { role_id: roleId } = parseValidationResult(
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
  const { role_id: roleId } = parseValidationResult(
    validatedResult,
    HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
  );

  return roleId;
}

/**********************************************************************************/

export { validateCreateRole, validateDeleteRole, validateUpdateRole };
