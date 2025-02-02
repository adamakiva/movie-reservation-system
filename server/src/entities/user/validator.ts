import type { Request } from 'express';
import zod, { ZodIssueCode } from 'zod';

import { decodeCursor, HTTP_STATUS_CODES } from '../../utils/index.js';

import {
  coerceNumber,
  cursorSchema,
  parseValidationResult,
  VALIDATION,
} from '../utils.validator.js';

/**********************************************************************************/

const { ROLE, PARAMS, USER, PAGINATION, QUERY } = VALIDATION;

/**********************************************************************************/

const getUsersSchema = zod
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
    if (!val.cursor || val.cursor === 'undefined' || val.cursor === 'null') {
      return {
        pageSize: val['page-size'],
      } as const;
    }

    try {
      const { id: userId, createdAt } = cursorSchema.parse(
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
  });

const getUserSchema = zod.object(
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
);

const createUserSchema = zod.object({
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
    .min(USER.PASSWORD.MIN_LENGTH.VALUE, USER.PASSWORD.MIN_LENGTH.ERROR_MESSAGE)
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
});

const updateUserBodySchema = zod
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
  });

const updateUserParamsSchema = zod.object(
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
);

const deleteUserSchema = zod.object(
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
);

/**********************************************************************************/

function validateGetUsers(req: Request) {
  const { query } = req;

  const validatedResult = getUsersSchema.safeParse(query);
  const parsedValidatedResult = parseValidationResult(
    validatedResult,
    HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
  );

  return parsedValidatedResult;
}

function validateGetUser(req: Request) {
  const { params } = req;

  const validatedResult = getUserSchema.safeParse(params);
  const { user_id: userId } = parseValidationResult(
    validatedResult,
    HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
  );

  return userId;
}

function validateCreateUser(req: Request) {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const { body } = req;

  const validatedResult = createUserSchema.safeParse(body);
  const parsedValidatedResult = parseValidationResult(
    validatedResult,
    HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
  );

  return parsedValidatedResult;
}

function validateUpdateUser(req: Request) {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const { body, params } = req;

  const validatedBodyResult = updateUserBodySchema.safeParse(body);
  const userToUpdate = parseValidationResult(
    validatedBodyResult,
    HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
  );

  const validatedParamsResult = updateUserParamsSchema.safeParse(params);
  const { user_id: userId } = parseValidationResult(
    validatedParamsResult,
    HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
  );

  return {
    ...userToUpdate,
    userId,
  } as const;
}

function validateDeleteUser(req: Request) {
  const { params } = req;

  const validatedResult = deleteUserSchema.safeParse(params);
  const { user_id: userId } = parseValidationResult(
    validatedResult,
    HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
  );

  return userId;
}

/**********************************************************************************/

export {
  validateCreateUser,
  validateDeleteUser,
  validateGetUser,
  validateGetUsers,
  validateUpdateUser,
};
