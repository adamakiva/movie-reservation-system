import type { Request } from 'express';
import zod, { ZodIssueCode } from 'zod';

import {
  coerceNumber,
  CURSOR_SCHEMA,
  decodeCursor,
  parseValidationResult,
  VALIDATION,
} from '../utils.validator.ts';

/**********************************************************************************/

const { PAGINATION, QUERY, PARAMS } = VALIDATION;

const ROLE = {
  ID: {
    INVALID_TYPE_ERROR_MESSAGE: 'Role id must be a string',
    REQUIRED_ERROR_MESSAGE: 'Role id is required',
    ERROR_MESSAGE: 'Role id must be a valid UUIDV4',
  },
} as const;

const USER = {
  NO_FIELDS_TO_UPDATE_ERROR_MESSAGE: 'Empty update is not allowed',
  ID: {
    INVALID_TYPE_ERROR_MESSAGE: 'User id must be a string',
    REQUIRED_ERROR_MESSAGE: 'User id is required',
    ERROR_MESSAGE: 'User id must be a valid UUIDV4',
  },
  FIRST_NAME: {
    INVALID_TYPE_ERROR_MESSAGE: 'First name must be a string',
    REQUIRED_ERROR_MESSAGE: 'First name is required',
    MIN_LENGTH: {
      VALUE: 2,
      ERROR_MESSAGE: 'First name must be at least 2 characters long',
    },
    MAX_LENGTH: {
      VALUE: 64,
      ERROR_MESSAGE: 'First name must be at most 64 characters long',
    },
  },
  LAST_NAME: {
    INVALID_TYPE_ERROR_MESSAGE: 'Last name must be a string',
    REQUIRED_ERROR_MESSAGE: 'Last name is required',
    MIN_LENGTH: {
      VALUE: 1,
      ERROR_MESSAGE: 'Last name must be at least 1 character long',
    },
    MAX_LENGTH: {
      VALUE: 128,
      ERROR_MESSAGE: 'Last name must be at most 128 characters long',
    },
  },
  EMAIL: {
    ERROR_MESSAGE: 'Invalid email address',
    INVALID_TYPE_ERROR_MESSAGE: 'Email must be a string',
    REQUIRED_ERROR_MESSAGE: 'Email is required',
    MIN_LENGTH: {
      VALUE: 3,
      ERROR_MESSAGE: 'Email must be at least 3 characters long',
    },
    MAX_LENGTH: {
      VALUE: 256,
      ERROR_MESSAGE: 'Email must be at most 256 characters long',
    },
  },
  PASSWORD: {
    INVALID_TYPE_ERROR_MESSAGE: 'Password must be a string',
    REQUIRED_ERROR_MESSAGE: 'Password is required',
    MIN_LENGTH: {
      VALUE: 4,
      ERROR_MESSAGE: 'Password must be at least 4 characters long',
    },
    MAX_LENGTH: {
      VALUE: 64,
      ERROR_MESSAGE: 'Password must be at most 64 characters long',
    },
  },
  ROLE_ID: {
    INVALID_TYPE_ERROR_MESSAGE: 'Role id must be a string',
    REQUIRED_ERROR_MESSAGE: 'Role id is required',
    ERROR_MESSAGE: 'Role id must be a valid UUIDV4',
  },
} as const;

const USER_SCHEMAS = {
  READ: {
    MANY: zod
      .object(
        {
          cursor: zod
            .string({
              invalid_type_error: PAGINATION.CURSOR.INVALID_TYPE_ERROR_MESSAGE,
            })
            .min(
              PAGINATION.CURSOR.MIN_LENGTH.VALUE,
              PAGINATION.CURSOR.MIN_LENGTH.ERROR_MESSAGE,
            )
            .max(
              PAGINATION.CURSOR.MAX_LENGTH.VALUE,
              PAGINATION.CURSOR.MAX_LENGTH.ERROR_MESSAGE,
            )
            .base64(PAGINATION.CURSOR.ERROR_MESSAGE)
            .optional(),
          'page-size': zod
            .preprocess(
              coerceNumber(PAGINATION.PAGE_SIZE.INVALID_TYPE_ERROR_MESSAGE),
              zod
                .number()
                .min(
                  PAGINATION.PAGE_SIZE.MIN_LENGTH.VALUE,
                  PAGINATION.PAGE_SIZE.MIN_LENGTH.ERROR_MESSAGE,
                )
                .max(
                  PAGINATION.PAGE_SIZE.MAX_LENGTH.VALUE,
                  PAGINATION.PAGE_SIZE.MAX_LENGTH.ERROR_MESSAGE,
                ),
            )
            .default(PAGINATION.PAGE_SIZE.DEFAULT_VALUE),
        },
        {
          invalid_type_error: QUERY.INVALID_TYPE_ERROR_MESSAGE,
          required_error: QUERY.REQUIRED_ERROR_MESSAGE,
        },
      )
      .transform((val, context) => {
        if (
          !val.cursor ||
          val.cursor === 'undefined' ||
          val.cursor === 'null'
        ) {
          return {
            pageSize: val['page-size'],
          } as const;
        }

        try {
          const { id: userId, createdAt } = CURSOR_SCHEMA.parse(
            decodeCursor(val.cursor),
          );

          return {
            cursor: { userId, createdAt },
            pageSize: val['page-size'],
          } as const;
        } catch {
          context.addIssue({
            code: ZodIssueCode.custom,
            message: PAGINATION.CURSOR.ERROR_MESSAGE,
            fatal: true,
          });
        }

        return zod.NEVER;
      }),
    SINGLE: zod.object(
      {
        user_id: zod
          .string({
            invalid_type_error: USER.ID.INVALID_TYPE_ERROR_MESSAGE,
            required_error: USER.ID.REQUIRED_ERROR_MESSAGE,
          })
          .uuid(USER.ID.ERROR_MESSAGE),
      },
      {
        invalid_type_error: PARAMS.INVALID_TYPE_ERROR_MESSAGE,
        required_error: PARAMS.REQUIRED_ERROR_MESSAGE,
      },
    ),
  },
  CREATE: zod.object({
    firstName: zod
      .string({
        invalid_type_error: USER.FIRST_NAME.INVALID_TYPE_ERROR_MESSAGE,
        required_error: USER.FIRST_NAME.REQUIRED_ERROR_MESSAGE,
      })
      .min(
        USER.FIRST_NAME.MIN_LENGTH.VALUE,
        USER.FIRST_NAME.MIN_LENGTH.ERROR_MESSAGE,
      )
      .max(
        USER.FIRST_NAME.MAX_LENGTH.VALUE,
        USER.FIRST_NAME.MAX_LENGTH.ERROR_MESSAGE,
      ),
    lastName: zod
      .string({
        invalid_type_error: USER.LAST_NAME.INVALID_TYPE_ERROR_MESSAGE,
        required_error: USER.LAST_NAME.REQUIRED_ERROR_MESSAGE,
      })
      .min(
        USER.LAST_NAME.MIN_LENGTH.VALUE,
        USER.LAST_NAME.MIN_LENGTH.ERROR_MESSAGE,
      )
      .max(
        USER.LAST_NAME.MAX_LENGTH.VALUE,
        USER.LAST_NAME.MAX_LENGTH.ERROR_MESSAGE,
      ),
    email: zod
      .string({
        invalid_type_error: USER.EMAIL.INVALID_TYPE_ERROR_MESSAGE,
        required_error: USER.EMAIL.REQUIRED_ERROR_MESSAGE,
      })
      .min(USER.EMAIL.MIN_LENGTH.VALUE, USER.EMAIL.MIN_LENGTH.ERROR_MESSAGE)
      .max(USER.EMAIL.MAX_LENGTH.VALUE, USER.EMAIL.MAX_LENGTH.ERROR_MESSAGE)
      .email(USER.EMAIL.ERROR_MESSAGE),
    password: zod
      .string({
        invalid_type_error: USER.PASSWORD.INVALID_TYPE_ERROR_MESSAGE,
        required_error: USER.PASSWORD.REQUIRED_ERROR_MESSAGE,
      })
      .min(
        USER.PASSWORD.MIN_LENGTH.VALUE,
        USER.PASSWORD.MIN_LENGTH.ERROR_MESSAGE,
      )
      .max(
        USER.PASSWORD.MAX_LENGTH.VALUE,
        USER.PASSWORD.MAX_LENGTH.ERROR_MESSAGE,
      ),
    roleId: zod
      .string({
        invalid_type_error: ROLE.ID.INVALID_TYPE_ERROR_MESSAGE,
        required_error: ROLE.ID.REQUIRED_ERROR_MESSAGE,
      })
      .uuid(ROLE.ID.ERROR_MESSAGE),
  }),
  UPDATE: {
    BODY: zod
      .object({
        firstName: zod
          .string({
            invalid_type_error: USER.FIRST_NAME.INVALID_TYPE_ERROR_MESSAGE,
            required_error: USER.FIRST_NAME.REQUIRED_ERROR_MESSAGE,
          })
          .min(
            USER.FIRST_NAME.MIN_LENGTH.VALUE,
            USER.FIRST_NAME.MIN_LENGTH.ERROR_MESSAGE,
          )
          .max(
            USER.FIRST_NAME.MAX_LENGTH.VALUE,
            USER.FIRST_NAME.MAX_LENGTH.ERROR_MESSAGE,
          )
          .optional(),
        lastName: zod
          .string({
            invalid_type_error: USER.LAST_NAME.INVALID_TYPE_ERROR_MESSAGE,
            required_error: USER.LAST_NAME.REQUIRED_ERROR_MESSAGE,
          })
          .min(
            USER.LAST_NAME.MIN_LENGTH.VALUE,
            USER.LAST_NAME.MIN_LENGTH.ERROR_MESSAGE,
          )
          .max(
            USER.LAST_NAME.MAX_LENGTH.VALUE,
            USER.LAST_NAME.MAX_LENGTH.ERROR_MESSAGE,
          )
          .optional(),
        email: zod
          .string({
            invalid_type_error: USER.EMAIL.INVALID_TYPE_ERROR_MESSAGE,
            required_error: USER.EMAIL.REQUIRED_ERROR_MESSAGE,
          })
          .min(USER.EMAIL.MIN_LENGTH.VALUE, USER.EMAIL.MIN_LENGTH.ERROR_MESSAGE)
          .max(USER.EMAIL.MAX_LENGTH.VALUE, USER.EMAIL.MAX_LENGTH.ERROR_MESSAGE)
          .email(USER.EMAIL.ERROR_MESSAGE)
          .optional(),
        password: zod
          .string({
            invalid_type_error: USER.PASSWORD.INVALID_TYPE_ERROR_MESSAGE,
            required_error: USER.PASSWORD.REQUIRED_ERROR_MESSAGE,
          })
          .min(
            USER.PASSWORD.MIN_LENGTH.VALUE,
            USER.PASSWORD.MIN_LENGTH.ERROR_MESSAGE,
          )
          .max(
            USER.PASSWORD.MAX_LENGTH.VALUE,
            USER.PASSWORD.MAX_LENGTH.ERROR_MESSAGE,
          )
          .optional(),
        roleId: zod
          .string({
            invalid_type_error: ROLE.ID.INVALID_TYPE_ERROR_MESSAGE,
            required_error: ROLE.ID.REQUIRED_ERROR_MESSAGE,
          })
          .uuid(ROLE.ID.ERROR_MESSAGE)
          .optional(),
      })
      .superRefine((userUpdates, context) => {
        if (!Object.keys(userUpdates).length) {
          context.addIssue({
            code: ZodIssueCode.custom,
            message: USER.NO_FIELDS_TO_UPDATE_ERROR_MESSAGE,
            fatal: true,
          });
        }
      }),
    PARAMS: zod.object(
      {
        user_id: zod
          .string({
            invalid_type_error: USER.ID.INVALID_TYPE_ERROR_MESSAGE,
            required_error: USER.ID.REQUIRED_ERROR_MESSAGE,
          })
          .uuid(USER.ID.ERROR_MESSAGE),
      },
      {
        invalid_type_error: PARAMS.INVALID_TYPE_ERROR_MESSAGE,
        required_error: PARAMS.REQUIRED_ERROR_MESSAGE,
      },
    ),
  },
  DELETE: zod.object(
    {
      user_id: zod
        .string({
          invalid_type_error: USER.ID.INVALID_TYPE_ERROR_MESSAGE,
          required_error: USER.ID.REQUIRED_ERROR_MESSAGE,
        })
        .uuid(USER.ID.ERROR_MESSAGE),
    },
    {
      invalid_type_error: PARAMS.INVALID_TYPE_ERROR_MESSAGE,
      required_error: PARAMS.REQUIRED_ERROR_MESSAGE,
    },
  ),
} as const;

/**********************************************************************************/

function validateGetUsers(request: Request) {
  const validatedResult = parseValidationResult(
    USER_SCHEMAS.READ.MANY.safeParse(request.query),
  );

  return validatedResult;
}

function validateGetUser(request: Request) {
  const { user_id: userId } = parseValidationResult(
    USER_SCHEMAS.READ.SINGLE.safeParse(request.params),
  );

  return userId;
}

function validateCreateUser(request: Request) {
  const validatedResult = parseValidationResult(
    USER_SCHEMAS.CREATE.safeParse(request.body),
  );

  return validatedResult;
}

function validateUpdateUser(request: Request) {
  const userToUpdate = parseValidationResult(
    USER_SCHEMAS.UPDATE.BODY.safeParse(request.body),
  );
  const { user_id: userId } = parseValidationResult(
    USER_SCHEMAS.UPDATE.PARAMS.safeParse(request.params),
  );

  return {
    ...userToUpdate,
    userId,
  } as const;
}

function validateDeleteUser(request: Request) {
  const { user_id: userId } = parseValidationResult(
    USER_SCHEMAS.DELETE.safeParse(request.params),
  );

  return userId;
}

/**********************************************************************************/

export {
  USER,
  validateCreateUser,
  validateDeleteUser,
  validateGetUser,
  validateGetUsers,
  validateUpdateUser,
};
