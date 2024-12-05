import { MRSError, Zod, decodeCursor } from '../utils/index.js';

/**********************************************************************************/

const VALIDATION = {
  BODY: {
    INVALID_TYPE_ERROR_MESSAGE: 'Request body should be an object',
    REQUIRED_ERROR_MESSAGE: 'Request must have a body',
  },
  PARAMS: {
    INVALID_TYPE_ERROR_MESSAGE: 'Request params should be an object',
    REQUIRED_ERROR_MESSAGE: 'Request must have params',
  },
  QUERY: {
    INVALID_TYPE_ERROR_MESSAGE: 'Request query should be an object',
    REQUIRED_ERROR_MESSAGE: 'Request must have query params',
  },
  HEALTHCHECK: {
    HTTP_METHODS: {
      NAMES: ['HEAD', 'GET'],
      ERROR_MESSAGE: `HTTP method must be one of 'HEAD', 'GET'`,
      INVALID_TYPE_ERROR_MESSAGE: 'HTTP method must be a string',
      REQUIRED_ERROR_MESSAGE: 'HTTP method is required',
      MIN_LENGTH: {
        VALUE: 3,
        ERROR_MESSAGE: 'HTTP method must be at least 3 characters long',
      },
      MAX_LENGTH: {
        VALUE: 4,
        ERROR_MESSAGE: 'HTTP method must be at most 4 characters long',
      },
    },
  },
  AUTHENTICATION: {
    REFRESH: {
      TOKEN: {
        INVALID_TYPE_ERROR_MESSAGE: 'Refresh token must be a string',
        REQUIRED_ERROR_MESSAGE: 'Refresh token is required',
        MAX_LENGTH: {
          VALUE: 1_024,
          ERROR_MESSAGE: 'Refresh token must be at most 1024 characters long',
        },
      },
    },
  },
  ROLE: {
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
  },
  USER: {
    PAGINATION: {
      CURSOR: {
        INVALID_TYPE_ERROR_MESSAGE: 'Cursor must be a string',
        ERROR_MESSAGE: 'Invalid cursor',
        MIN_LENGTH: {
          VALUE: 1,
          ERROR_MESSAGE: 'Cursor must be at least 1 character long',
        },
        MAX_LENGTH: {
          VALUE: 128,
          ERROR_MESSAGE: 'Cursor must be at most 128 characters long',
        },
      },
      PAGE_SIZE: {
        INVALID_TYPE_ERROR_MESSAGE: 'Page size must be a number',
        DEFAULT_VALUE: 10,
        MIN_LENGTH: {
          VALUE: 1,
          ERROR_MESSAGE: 'Page size must be at least 1 character long',
        },
        MAX_LENGTH: {
          VALUE: 64,
          ERROR_MESSAGE: 'Page size must be at most 128 characters long',
        },
      },
    },
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
        ERROR_MESSAGE: 'Last name must be at least 2 characters long',
      },
      MAX_LENGTH: {
        VALUE: 128,
        ERROR_MESSAGE: 'Last name must be at most 64 characters long',
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
  },
} as const;

const { BODY, PARAMS, QUERY, HEALTHCHECK, AUTHENTICATION, ROLE, USER } =
  VALIDATION;

/**********************************************************************************/

function parseValidationResult<I, O>(
  res: Zod.SafeParseReturnType<I, O>,
  statusCode: number,
) {
  if (!res.success) {
    const errorMessages = res.error.errors
      .map((err) => {
        return err.message;
      })
      .join(', ');

    throw new MRSError(statusCode, errorMessages, res.error.cause);
  }

  return res.data;
}

/**********************************************************************************/

const healthCheckSchema = Zod.string({
  invalid_type_error: HEALTHCHECK.HTTP_METHODS.INVALID_TYPE_ERROR_MESSAGE,
  required_error: HEALTHCHECK.HTTP_METHODS.REQUIRED_ERROR_MESSAGE,
})
  .min(
    HEALTHCHECK.HTTP_METHODS.MIN_LENGTH.VALUE,
    HEALTHCHECK.HTTP_METHODS.MIN_LENGTH.ERROR_MESSAGE,
  )
  .max(
    HEALTHCHECK.HTTP_METHODS.MAX_LENGTH.VALUE,
    HEALTHCHECK.HTTP_METHODS.MAX_LENGTH.ERROR_MESSAGE,
  )
  .toUpperCase()
  .pipe(
    Zod.enum(HEALTHCHECK.HTTP_METHODS.NAMES, {
      errorMap: () => {
        return {
          message: HEALTHCHECK.HTTP_METHODS.ERROR_MESSAGE,
        } as const;
      },
    }),
  );

/**********************************************************************************/

const loginSchema = Zod.object(
  {
    email: Zod.string({
      invalid_type_error: USER.EMAIL.INVALID_TYPE_ERROR_MESSAGE,
      required_error: USER.EMAIL.REQUIRED_ERROR_MESSAGE,
    })
      .min(USER.EMAIL.MIN_LENGTH.VALUE, USER.EMAIL.MIN_LENGTH.ERROR_MESSAGE)
      .max(USER.EMAIL.MAX_LENGTH.VALUE, USER.EMAIL.MAX_LENGTH.ERROR_MESSAGE)
      .email(USER.EMAIL.ERROR_MESSAGE),
    password: Zod.string({
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
  },
  {
    invalid_type_error: BODY.INVALID_TYPE_ERROR_MESSAGE,
    required_error: BODY.REQUIRED_ERROR_MESSAGE,
  },
);

const refreshTokenSchema = Zod.object(
  {
    refreshToken: Zod.string({
      invalid_type_error:
        AUTHENTICATION.REFRESH.TOKEN.INVALID_TYPE_ERROR_MESSAGE,
      required_error: AUTHENTICATION.REFRESH.TOKEN.REQUIRED_ERROR_MESSAGE,
    }).max(
      AUTHENTICATION.REFRESH.TOKEN.MAX_LENGTH.VALUE,
      AUTHENTICATION.REFRESH.TOKEN.MAX_LENGTH.ERROR_MESSAGE,
    ),
  },
  {
    invalid_type_error: BODY.INVALID_TYPE_ERROR_MESSAGE,
    required_error: BODY.REQUIRED_ERROR_MESSAGE,
  },
);

/**********************************************************************************/

const createRoleSchema = Zod.object(
  {
    name: Zod.string({
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

const updateRoleBodySchema = Zod.object(
  {
    name: Zod.string({
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
).superRefine((val, ctx) => {
  if (!Object.keys(val).length) {
    ctx.addIssue({
      code: Zod.ZodIssueCode.custom,
      message: ROLE.NO_FIELDS_TO_UPDATE_ERROR_MESSAGE,
      fatal: true,
    });
  }
});

const updateRoleParamsSchema = Zod.object(
  {
    roleId: Zod.string({
      invalid_type_error: ROLE.ID.INVALID_TYPE_ERROR_MESSAGE,
      required_error: ROLE.ID.REQUIRED_ERROR_MESSAGE,
    }).uuid(ROLE.ID.ERROR_MESSAGE),
  },
  {
    invalid_type_error: PARAMS.INVALID_TYPE_ERROR_MESSAGE,
    required_error: PARAMS.REQUIRED_ERROR_MESSAGE,
  },
);

const deleteRoleSchema = Zod.object(
  {
    roleId: Zod.string({
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

const getUsersSchema = Zod.object(
  {
    cursor: Zod.string({
      invalid_type_error: USER.PAGINATION.CURSOR.INVALID_TYPE_ERROR_MESSAGE,
    })
      .min(
        USER.PAGINATION.CURSOR.MIN_LENGTH.VALUE,
        USER.PAGINATION.CURSOR.MIN_LENGTH.ERROR_MESSAGE,
      )
      .max(
        USER.PAGINATION.CURSOR.MAX_LENGTH.VALUE,
        USER.PAGINATION.CURSOR.MAX_LENGTH.ERROR_MESSAGE,
      )
      .optional(),
    pageSize: Zod.coerce
      .number({
        invalid_type_error:
          USER.PAGINATION.PAGE_SIZE.INVALID_TYPE_ERROR_MESSAGE,
      })
      .min(
        USER.PAGINATION.PAGE_SIZE.MIN_LENGTH.VALUE,
        USER.PAGINATION.PAGE_SIZE.MIN_LENGTH.ERROR_MESSAGE,
      )
      .max(
        USER.PAGINATION.PAGE_SIZE.MAX_LENGTH.VALUE,
        USER.PAGINATION.PAGE_SIZE.MAX_LENGTH.ERROR_MESSAGE,
      )
      .default(USER.PAGINATION.PAGE_SIZE.DEFAULT_VALUE),
  },
  {
    invalid_type_error: QUERY.INVALID_TYPE_ERROR_MESSAGE,
    required_error: QUERY.REQUIRED_ERROR_MESSAGE,
  },
).transform(({ cursor, pageSize }, ctx) => {
  if (!cursor) {
    return {
      pageSize,
    } as const;
  }

  try {
    const { id: userId, createdAt } = decodeCursor(cursor);

    return {
      cursor: { userId, createdAt },
      pageSize,
    } as const;
  } catch {
    ctx.addIssue({
      code: Zod.ZodIssueCode.custom,
      message: USER.PAGINATION.CURSOR.ERROR_MESSAGE,
      fatal: true,
    });
  }

  return Zod.NEVER;
});

const getUserSchema = Zod.object(
  {
    userId: Zod.string({
      invalid_type_error: USER.ID.INVALID_TYPE_ERROR_MESSAGE,
      required_error: USER.ID.REQUIRED_ERROR_MESSAGE,
    }).uuid(USER.ID.ERROR_MESSAGE),
  },
  {
    invalid_type_error: PARAMS.INVALID_TYPE_ERROR_MESSAGE,
    required_error: PARAMS.REQUIRED_ERROR_MESSAGE,
  },
);

const createUserSchema = Zod.object({
  firstName: Zod.string({
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
  lastName: Zod.string({
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
  email: Zod.string({
    invalid_type_error: USER.EMAIL.INVALID_TYPE_ERROR_MESSAGE,
    required_error: USER.EMAIL.REQUIRED_ERROR_MESSAGE,
  })
    .min(USER.EMAIL.MIN_LENGTH.VALUE, USER.EMAIL.MIN_LENGTH.ERROR_MESSAGE)
    .max(USER.EMAIL.MAX_LENGTH.VALUE, USER.EMAIL.MAX_LENGTH.ERROR_MESSAGE)
    .email(USER.EMAIL.ERROR_MESSAGE),
  password: Zod.string({
    invalid_type_error: USER.PASSWORD.INVALID_TYPE_ERROR_MESSAGE,
    required_error: USER.PASSWORD.REQUIRED_ERROR_MESSAGE,
  })
    .min(USER.PASSWORD.MIN_LENGTH.VALUE, USER.PASSWORD.MIN_LENGTH.ERROR_MESSAGE)
    .max(
      USER.PASSWORD.MAX_LENGTH.VALUE,
      USER.PASSWORD.MAX_LENGTH.ERROR_MESSAGE,
    ),
  roleId: Zod.string({
    invalid_type_error: ROLE.ID.INVALID_TYPE_ERROR_MESSAGE,
    required_error: ROLE.ID.REQUIRED_ERROR_MESSAGE,
  }).uuid(ROLE.ID.ERROR_MESSAGE),
});

const updateUserBodySchema = Zod.object({
  firstName: Zod.string({
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
  lastName: Zod.string({
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
  email: Zod.string({
    invalid_type_error: USER.EMAIL.INVALID_TYPE_ERROR_MESSAGE,
    required_error: USER.EMAIL.REQUIRED_ERROR_MESSAGE,
  })
    .min(USER.EMAIL.MIN_LENGTH.VALUE, USER.EMAIL.MIN_LENGTH.ERROR_MESSAGE)
    .max(USER.EMAIL.MAX_LENGTH.VALUE, USER.EMAIL.MAX_LENGTH.ERROR_MESSAGE)
    .email(USER.EMAIL.ERROR_MESSAGE)
    .optional(),
  password: Zod.string({
    invalid_type_error: USER.PASSWORD.INVALID_TYPE_ERROR_MESSAGE,
    required_error: USER.PASSWORD.REQUIRED_ERROR_MESSAGE,
  })
    .min(USER.PASSWORD.MIN_LENGTH.VALUE, USER.PASSWORD.MIN_LENGTH.ERROR_MESSAGE)
    .max(USER.PASSWORD.MAX_LENGTH.VALUE, USER.PASSWORD.MAX_LENGTH.ERROR_MESSAGE)
    .optional(),
  roleId: Zod.string({
    invalid_type_error: ROLE.ID.INVALID_TYPE_ERROR_MESSAGE,
    required_error: ROLE.ID.REQUIRED_ERROR_MESSAGE,
  })
    .uuid(ROLE.ID.ERROR_MESSAGE)
    .optional(),
}).superRefine((val, ctx) => {
  if (!Object.keys(val).length) {
    ctx.addIssue({
      code: Zod.ZodIssueCode.custom,
      message: ROLE.NO_FIELDS_TO_UPDATE_ERROR_MESSAGE,
      fatal: true,
    });
  }
});

const updateUserParamsSchema = Zod.object(
  {
    userId: Zod.string({
      invalid_type_error: USER.ID.INVALID_TYPE_ERROR_MESSAGE,
      required_error: USER.ID.REQUIRED_ERROR_MESSAGE,
    }).uuid(USER.ID.ERROR_MESSAGE),
  },
  {
    invalid_type_error: PARAMS.INVALID_TYPE_ERROR_MESSAGE,
    required_error: PARAMS.REQUIRED_ERROR_MESSAGE,
  },
);

const deleteUserSchema = Zod.object(
  {
    userId: Zod.string({
      invalid_type_error: USER.ID.INVALID_TYPE_ERROR_MESSAGE,
      required_error: USER.ID.REQUIRED_ERROR_MESSAGE,
    }).uuid(USER.ID.ERROR_MESSAGE),
  },
  {
    invalid_type_error: PARAMS.INVALID_TYPE_ERROR_MESSAGE,
    required_error: PARAMS.REQUIRED_ERROR_MESSAGE,
  },
);

/**********************************************************************************/

export {
  VALIDATION,
  createRoleSchema,
  createUserSchema,
  deleteRoleSchema,
  deleteUserSchema,
  getUserSchema,
  getUsersSchema,
  healthCheckSchema,
  loginSchema,
  parseValidationResult,
  refreshTokenSchema,
  updateRoleBodySchema,
  updateRoleParamsSchema,
  updateUserBodySchema,
  updateUserParamsSchema,
};
