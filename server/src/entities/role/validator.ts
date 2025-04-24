import type { Request } from 'express';
import zod, { ZodIssueCode } from 'zod';

import { parseValidationResult, VALIDATION } from '../utils.ts';

/**********************************************************************************/

const { BODY, PARAMS } = VALIDATION;

const ROLE = {
  NO_FIELDS_TO_UPDATE_ERROR_MESSAGE: 'Empty update is not allowed',
  ID: {
    INVALID_TYPE_ERROR_MESSAGE: 'Role id must be a string',
    REQUIRED_ERROR_MESSAGE: 'Role id is required',
    ERROR_MESSAGE: 'Role id must be a valid UUIDV4',
  },
  NAME: {
    INVALID_TYPE_ERROR_MESSAGE: 'Role name must be a string',
    REQUIRED_ERROR_MESSAGE: 'Role name is required',
    MIN_LENGTH: {
      VALUE: 1,
      ERROR_MESSAGE: 'Role name must be at least 1 character long',
    },
    MAX_LENGTH: {
      VALUE: 64,
      ERROR_MESSAGE: 'Role name must be at most 64 characters long',
    },
  },
} as const;

const ROLE_SCHEMAS = {
  CREATE: zod.object(
    {
      id: zod
        .string({
          invalid_type_error: ROLE.ID.INVALID_TYPE_ERROR_MESSAGE,
        })
        .uuid(ROLE.ID.ERROR_MESSAGE)
        .optional(),
      name: zod
        .string({
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
  ),
  UPDATE: {
    BODY: zod
      .object(
        {
          name: zod
            .string({
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
      )
      .superRefine((roleUpdates, context) => {
        if (!Object.keys(roleUpdates).length) {
          context.addIssue({
            code: ZodIssueCode.custom,
            message: ROLE.NO_FIELDS_TO_UPDATE_ERROR_MESSAGE,
            fatal: true,
          });
        }
      }),
    PARAMS: zod.object(
      {
        role_id: zod
          .string({
            invalid_type_error: ROLE.ID.INVALID_TYPE_ERROR_MESSAGE,
            required_error: ROLE.ID.REQUIRED_ERROR_MESSAGE,
          })
          .uuid(ROLE.ID.ERROR_MESSAGE),
      },
      {
        invalid_type_error: PARAMS.INVALID_TYPE_ERROR_MESSAGE,
        required_error: PARAMS.REQUIRED_ERROR_MESSAGE,
      },
    ),
  },
  DELETE: zod.object(
    {
      role_id: zod
        .string({
          invalid_type_error: ROLE.ID.INVALID_TYPE_ERROR_MESSAGE,
          required_error: ROLE.ID.REQUIRED_ERROR_MESSAGE,
        })
        .uuid(ROLE.ID.ERROR_MESSAGE),
    },
    {
      invalid_type_error: PARAMS.INVALID_TYPE_ERROR_MESSAGE,
      required_error: PARAMS.REQUIRED_ERROR_MESSAGE,
    },
  ),
} as const;

/**********************************************************************************/

function validateCreateRole(request: Request) {
  const validatedResult = parseValidationResult(
    ROLE_SCHEMAS.CREATE.safeParse(request.body),
  );

  return validatedResult;
}

function validateUpdateRole(request: Request) {
  const { name } = parseValidationResult(
    ROLE_SCHEMAS.UPDATE.BODY.safeParse(request.body),
  );
  const { role_id: roleId } = parseValidationResult(
    ROLE_SCHEMAS.UPDATE.PARAMS.safeParse(request.params),
  );

  return {
    roleId,
    name,
  } as const;
}

function validateDeleteRole(request: Request) {
  const { role_id: roleId } = parseValidationResult(
    ROLE_SCHEMAS.DELETE.safeParse(request.params),
  );

  return roleId;
}

/**********************************************************************************/

export { ROLE, validateCreateRole, validateDeleteRole, validateUpdateRole };
