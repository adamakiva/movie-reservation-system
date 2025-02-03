import zod, {
  ZodIssueCode,
  type RefinementCtx,
  type SafeParseReturnType,
} from 'zod';

import {
  GeneralError,
  HTTP_STATUS_CODES,
  decodeCursor,
} from '../utils/index.ts';

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
        ERROR_MESSAGE: 'Page size must be at most 64 characters long',
      },
    },
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
        ERROR_MESSAGE: 'Invalid refresh token',
        INVALID_TYPE_ERROR_MESSAGE: 'Refresh token must be a string',
        REQUIRED_ERROR_MESSAGE: 'Refresh token is required',
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
  },
  GENRE: {
    NO_FIELDS_TO_UPDATE_ERROR_MESSAGE: 'Empty update is not allowed',
    ID: {
      INVALID_TYPE_ERROR_MESSAGE: 'Genre id must be a string',
      REQUIRED_ERROR_MESSAGE: 'Genre id is required',
      ERROR_MESSAGE: 'Genre id must be a valid UUIDV4',
    },
    NAME: {
      INVALID_TYPE_ERROR_MESSAGE: 'Genre name must be a string',
      REQUIRED_ERROR_MESSAGE: 'Genre name is required',
      MIN_LENGTH: {
        VALUE: 3,
        ERROR_MESSAGE: 'Genre name must be at least 3 character long',
      },
      MAX_LENGTH: {
        VALUE: 32,
        ERROR_MESSAGE: 'Genre name must be at most 32 characters long',
      },
    },
  },
  MOVIE: {
    NO_FIELDS_TO_UPDATE_ERROR_MESSAGE: 'Empty update is not allowed',
    ID: {
      INVALID_TYPE_ERROR_MESSAGE: 'Movie id must be a string',
      REQUIRED_ERROR_MESSAGE: 'Movie id is required',
      ERROR_MESSAGE: 'Movie id must be a valid UUIDV4',
    },
    TITLE: {
      INVALID_TYPE_ERROR_MESSAGE: 'Title must be a string',
      REQUIRED_ERROR_MESSAGE: 'Title is required',
      MIN_LENGTH: {
        VALUE: 1,
        ERROR_MESSAGE: 'Title must be at least 1 character long',
      },
      MAX_LENGTH: {
        VALUE: 128,
        ERROR_MESSAGE: 'Title must be at most 128 characters long',
      },
    },
    DESCRIPTION: {
      INVALID_TYPE_ERROR_MESSAGE: 'Description must be a string',
      REQUIRED_ERROR_MESSAGE: 'Description is required',
      MIN_LENGTH: {
        VALUE: 2,
        ERROR_MESSAGE: 'Description must be at least 2 characters long',
      },
      MAX_LENGTH: {
        VALUE: 2_048,
        ERROR_MESSAGE: 'Description must be at most 2,048 characters long',
      },
    },
    POSTER: {
      INVALID_TYPE_ERROR_MESSAGE: 'Poster must be a valid image',
      REQUIRED_ERROR_MESSAGE: 'Poster is required',
      FILE_NAME: {
        INVALID_TYPE_ERROR_MESSAGE: 'Poster file name be a valid image',
        REQUIRED_ERROR_MESSAGE: 'Poster file name is required',
        MIN_LENGTH: {
          VALUE: 1,
          ERROR_MESSAGE: 'Poster file name must be at least 1 character long',
        },
        MAX_LENGTH: {
          VALUE: 256,
          ERROR_MESSAGE: 'Poster file name must be at most 256 characters long',
        },
      },
      ABSOLUTE_FILE_PATH: {
        INVALID_TYPE_ERROR_MESSAGE:
          'Poster file absolute path must be a valid image',
        REQUIRED_ERROR_MESSAGE: 'Poster file absolute path is required',
        MIN_LENGTH: {
          VALUE: 1,
          ERROR_MESSAGE:
            'Poster file absolute path name must be at least 1 character long',
        },
        MAX_LENGTH: {
          VALUE: 512,
          ERROR_MESSAGE:
            'Poster file absolute path name must be at most 512 characters long',
        },
      },
      MIME_TYPE: {
        INVALID_TYPE_ERROR_MESSAGE: 'Poster mime type must be a valid string',
        REQUIRED_ERROR_MESSAGE: 'Poster mime type is required',
      },
      FILE_SIZE: {
        INVALID_TYPE_ERROR_MESSAGE: 'Poster file size must be a valid number',
        REQUIRED_ERROR_MESSAGE: 'Poster file size is required',
        MIN_VALUE: {
          VALUE: 1, // In bytes
          ERROR_MESSAGE: 'Poster size is too small',
        },
        MAX_VALUE: {
          VALUE: 4_194_304, // In bytes
          ERROR_MESSAGE: 'Poster size is too large',
        },
      },
    },
    PRICE: {
      INVALID_TYPE_ERROR_MESSAGE: 'Price must be a number',
      REQUIRED_ERROR_MESSAGE: 'Price is required',
      MIN_VALUE: {
        VALUE: 0.01,
        ERROR_MESSAGE: 'Price must be at least 0.01$',
      },
      MAX_VALUE: {
        VALUE: 100.0,
        ERROR_MESSAGE: 'Price must be at most 100.0$',
      },
    },
    GENRE_ID: {
      INVALID_TYPE_ERROR_MESSAGE: 'Genre id must be a string',
      REQUIRED_ERROR_MESSAGE: 'Genre id is required',
      ERROR_MESSAGE: 'Genre id must be a valid UUIDV4',
    },
  },
  HALL: {
    NO_FIELDS_TO_UPDATE_ERROR_MESSAGE: 'Empty update is not allowed',
    ID: {
      INVALID_TYPE_ERROR_MESSAGE: 'Hall id must be a string',
      REQUIRED_ERROR_MESSAGE: 'Hall id is required',
      ERROR_MESSAGE: 'Hall id must be a valid UUIDV4',
    },
    NAME: {
      INVALID_TYPE_ERROR_MESSAGE: 'Hall name must be a string',
      REQUIRED_ERROR_MESSAGE: 'Hall name is required',
      MIN_LENGTH: {
        VALUE: 2,
        ERROR_MESSAGE: 'Hall name must be at least 2 character long',
      },
      MAX_LENGTH: {
        VALUE: 32,
        ERROR_MESSAGE: 'Hall name must be at most 32 characters long',
      },
    },
    ROWS: {
      INVALID_TYPE_ERROR_MESSAGE: 'Hall rows must be a number',
      REQUIRED_ERROR_MESSAGE: 'Hall rows is required',
      MIN_LENGTH: {
        VALUE: 1,
        ERROR_MESSAGE: 'Hall rows must be at least 1',
      },
      MAX_LENGTH: {
        VALUE: 128,
        ERROR_MESSAGE: 'Hall rows must be at most 128',
      },
    },
    COLUMNS: {
      INVALID_TYPE_ERROR_MESSAGE: 'Hall columns must be a number',
      REQUIRED_ERROR_MESSAGE: 'Hall columns is required',
      MIN_LENGTH: {
        VALUE: 1,
        ERROR_MESSAGE: 'Hall columns must be at least 1',
      },
      MAX_LENGTH: {
        VALUE: 64,
        ERROR_MESSAGE: 'Hall columns must be at most 64',
      },
    },
  },
  SHOWTIME: {
    ID: {
      INVALID_TYPE_ERROR_MESSAGE: 'Showtime id must be a string',
      REQUIRED_ERROR_MESSAGE: 'Showtime id is required',
      ERROR_MESSAGE: 'Showtime id must be a valid UUIDV4',
    },
    AT: {
      INVALID_TYPE_ERROR_MESSAGE: 'Invalid showtime',
      MIN_VALUE: {
        VALUE: () => {
          return Date.now() + 60_000;
        },
        ERROR_MESSAGE: 'Showtime must be a future date',
      },
    },
    MOVIE_ID: {
      INVALID_TYPE_ERROR_MESSAGE: 'Movie id must be a string',
      REQUIRED_ERROR_MESSAGE: 'Movie id is required',
      ERROR_MESSAGE: 'Movie id must be a valid UUIDV4',
    },
    HALL_ID: {
      INVALID_TYPE_ERROR_MESSAGE: 'Hall id must be a string',
      REQUIRED_ERROR_MESSAGE: 'Hall id is required',
      ERROR_MESSAGE: 'Hall id must be a valid UUIDV4',
    },
    ROWS: {
      INVALID_TYPE_ERROR_MESSAGE: 'Row must be a number',
      REQUIRED_ERROR_MESSAGE: 'Row is required',
      MIN_LENGTH: (value: number) => {
        return `Row must be at least ${value}`;
      },
      MAX_LENGTH: (value: number) => {
        return `Row must be at most ${value}`;
      },
    },
    COLUMNS: {
      INVALID_TYPE_ERROR_MESSAGE: 'Column must be a number',
      REQUIRED_ERROR_MESSAGE: 'Column is required',
      MIN_LENGTH: (value: number) => {
        return `Column must be at least ${value}`;
      },
      MAX_LENGTH: (value: number) => {
        return `Column must be at most ${value}`;
      },
    },
  },
} as const;

const {
  BODY,
  PARAMS,
  QUERY,
  PAGINATION,
  HEALTHCHECK,
  AUTHENTICATION,
  ROLE,
  USER,
  GENRE,
  MOVIE,
  HALL,
  SHOWTIME,
} = VALIDATION;

/**********************************************************************************/

function parseValidationResult<I, O>(
  res: SafeParseReturnType<I, O>,
  statusCode: number = HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
) {
  if (res.success) {
    return res.data;
  }

  const errorMessages = res.error.errors
    .map((err) => {
      return err.message;
    })
    .join(', ');

  throw new GeneralError(statusCode, errorMessages, res.error.cause);
}

function coerceNumber(
  invalidTypeErrorMessage: string,
  missingErrorMessage?: string,
) {
  return (arg: unknown, context: RefinementCtx) => {
    const number = Number(arg);
    if (missingErrorMessage && (arg === undefined || arg === null)) {
      context.addIssue({
        code: ZodIssueCode.custom,
        message: missingErrorMessage,
        fatal: true,
      });

      return zod.NEVER;
    } else if (arg === '' || isNaN(number)) {
      context.addIssue({
        code: ZodIssueCode.custom,
        message: invalidTypeErrorMessage,
        fatal: true,
      });

      return zod.NEVER;
    }

    return number;
  };
}

/****************************** Schemas *******************************************/

// The cursor schema is checked with a programmer created object, so the
// error messages only exist for possible error paths
const cursorSchema = zod.object({
  id: zod
    .string({
      invalid_type_error: PAGINATION.CURSOR.ERROR_MESSAGE,
    })
    .uuid(PAGINATION.CURSOR.ERROR_MESSAGE),
  createdAt: zod.date({
    invalid_type_error: PAGINATION.CURSOR.ERROR_MESSAGE,
  }),
});

const SCHEMAS = {
  AUTHENTICATION: {
    LOGIN: zod.object(
      {
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
      },
      {
        invalid_type_error: BODY.INVALID_TYPE_ERROR_MESSAGE,
        required_error: BODY.REQUIRED_ERROR_MESSAGE,
      },
    ),
    REFRESH: zod.object(
      {
        refreshToken: zod
          .string({
            invalid_type_error:
              AUTHENTICATION.REFRESH.TOKEN.INVALID_TYPE_ERROR_MESSAGE,
            required_error: AUTHENTICATION.REFRESH.TOKEN.REQUIRED_ERROR_MESSAGE,
          })
          .jwt({
            message: AUTHENTICATION.REFRESH.TOKEN.ERROR_MESSAGE,
          }),
      },
      {
        invalid_type_error: BODY.INVALID_TYPE_ERROR_MESSAGE,
        required_error: BODY.REQUIRED_ERROR_MESSAGE,
      },
    ),
  },
  GENRE: {
    CREATE: zod.object(
      {
        id: zod
          .string({
            invalid_type_error: GENRE.ID.INVALID_TYPE_ERROR_MESSAGE,
          })
          .uuid(GENRE.ID.ERROR_MESSAGE)
          .optional(),
        name: zod
          .string({
            invalid_type_error: GENRE.NAME.INVALID_TYPE_ERROR_MESSAGE,
            required_error: GENRE.NAME.REQUIRED_ERROR_MESSAGE,
          })
          .min(GENRE.NAME.MIN_LENGTH.VALUE, GENRE.NAME.MIN_LENGTH.ERROR_MESSAGE)
          .max(GENRE.NAME.MAX_LENGTH.VALUE, GENRE.NAME.MAX_LENGTH.ERROR_MESSAGE)
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
                invalid_type_error: GENRE.NAME.INVALID_TYPE_ERROR_MESSAGE,
              })
              .min(
                GENRE.NAME.MIN_LENGTH.VALUE,
                GENRE.NAME.MIN_LENGTH.ERROR_MESSAGE,
              )
              .max(
                GENRE.NAME.MAX_LENGTH.VALUE,
                GENRE.NAME.MAX_LENGTH.ERROR_MESSAGE,
              )
              .toLowerCase()
              .optional(),
          },
          {
            invalid_type_error: BODY.INVALID_TYPE_ERROR_MESSAGE,
            required_error: BODY.REQUIRED_ERROR_MESSAGE,
          },
        )
        .superRefine((genreUpdates, context) => {
          if (!Object.keys(genreUpdates).length) {
            context.addIssue({
              code: ZodIssueCode.custom,
              message: GENRE.NO_FIELDS_TO_UPDATE_ERROR_MESSAGE,
              fatal: true,
            });
          }
        }),
      PARAMS: zod.object(
        {
          genre_id: zod
            .string({
              invalid_type_error: GENRE.ID.INVALID_TYPE_ERROR_MESSAGE,
              required_error: GENRE.ID.REQUIRED_ERROR_MESSAGE,
            })
            .uuid(GENRE.ID.ERROR_MESSAGE),
        },
        {
          invalid_type_error: PARAMS.INVALID_TYPE_ERROR_MESSAGE,
          required_error: PARAMS.REQUIRED_ERROR_MESSAGE,
        },
      ),
    },
    DELETE: zod.object(
      {
        genre_id: zod
          .string({
            invalid_type_error: GENRE.ID.INVALID_TYPE_ERROR_MESSAGE,
            required_error: GENRE.ID.REQUIRED_ERROR_MESSAGE,
          })
          .uuid(GENRE.ID.ERROR_MESSAGE),
      },
      {
        invalid_type_error: PARAMS.INVALID_TYPE_ERROR_MESSAGE,
        required_error: PARAMS.REQUIRED_ERROR_MESSAGE,
      },
    ),
  },
  HALL: {
    CREATE: zod.object(
      {
        id: zod
          .string({
            invalid_type_error: HALL.ID.INVALID_TYPE_ERROR_MESSAGE,
          })
          .uuid(HALL.ID.ERROR_MESSAGE)
          .optional(),
        name: zod
          .string({
            invalid_type_error: HALL.NAME.INVALID_TYPE_ERROR_MESSAGE,
            required_error: HALL.NAME.REQUIRED_ERROR_MESSAGE,
          })
          .min(HALL.NAME.MIN_LENGTH.VALUE, HALL.NAME.MIN_LENGTH.ERROR_MESSAGE)
          .max(HALL.NAME.MAX_LENGTH.VALUE, HALL.NAME.MAX_LENGTH.ERROR_MESSAGE)
          .toLowerCase(),
        rows: zod.preprocess(
          coerceNumber(
            HALL.ROWS.INVALID_TYPE_ERROR_MESSAGE,
            HALL.ROWS.REQUIRED_ERROR_MESSAGE,
          ),
          zod
            .number()
            .min(HALL.ROWS.MIN_LENGTH.VALUE, HALL.ROWS.MIN_LENGTH.ERROR_MESSAGE)
            .max(
              HALL.ROWS.MAX_LENGTH.VALUE,
              HALL.ROWS.MAX_LENGTH.ERROR_MESSAGE,
            ),
        ),
        columns: zod.preprocess(
          coerceNumber(
            HALL.COLUMNS.INVALID_TYPE_ERROR_MESSAGE,
            HALL.COLUMNS.REQUIRED_ERROR_MESSAGE,
          ),
          zod
            .number()
            .min(
              HALL.COLUMNS.MIN_LENGTH.VALUE,
              HALL.COLUMNS.MIN_LENGTH.ERROR_MESSAGE,
            )
            .max(
              HALL.COLUMNS.MAX_LENGTH.VALUE,
              HALL.COLUMNS.MAX_LENGTH.ERROR_MESSAGE,
            ),
        ),
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
                invalid_type_error: HALL.NAME.INVALID_TYPE_ERROR_MESSAGE,
                required_error: HALL.NAME.REQUIRED_ERROR_MESSAGE,
              })
              .min(
                HALL.NAME.MIN_LENGTH.VALUE,
                HALL.NAME.MIN_LENGTH.ERROR_MESSAGE,
              )
              .max(
                HALL.NAME.MAX_LENGTH.VALUE,
                HALL.NAME.MAX_LENGTH.ERROR_MESSAGE,
              )
              .toLowerCase()
              .optional(),
            rows: zod
              .preprocess(
                coerceNumber(HALL.ROWS.INVALID_TYPE_ERROR_MESSAGE),
                zod
                  .number()
                  .min(
                    HALL.ROWS.MIN_LENGTH.VALUE,
                    HALL.ROWS.MIN_LENGTH.ERROR_MESSAGE,
                  )
                  .max(
                    HALL.ROWS.MAX_LENGTH.VALUE,
                    HALL.ROWS.MAX_LENGTH.ERROR_MESSAGE,
                  ),
              )
              .optional(),
            columns: zod
              .preprocess(
                coerceNumber(HALL.COLUMNS.INVALID_TYPE_ERROR_MESSAGE),
                zod
                  .number()
                  .min(
                    HALL.COLUMNS.MIN_LENGTH.VALUE,
                    HALL.COLUMNS.MIN_LENGTH.ERROR_MESSAGE,
                  )
                  .max(
                    HALL.COLUMNS.MAX_LENGTH.VALUE,
                    HALL.COLUMNS.MAX_LENGTH.ERROR_MESSAGE,
                  ),
              )
              .optional(),
          },
          {
            invalid_type_error: BODY.INVALID_TYPE_ERROR_MESSAGE,
            required_error: BODY.REQUIRED_ERROR_MESSAGE,
          },
        )
        .superRefine((hallUpdates, context) => {
          if (!Object.keys(hallUpdates).length) {
            context.addIssue({
              code: ZodIssueCode.custom,
              message: HALL.NO_FIELDS_TO_UPDATE_ERROR_MESSAGE,
              fatal: true,
            });
          }
        }),
      PARAMS: zod.object(
        {
          hall_id: zod
            .string({
              invalid_type_error: HALL.ID.INVALID_TYPE_ERROR_MESSAGE,
              required_error: HALL.ID.REQUIRED_ERROR_MESSAGE,
            })
            .uuid(HALL.ID.ERROR_MESSAGE),
        },
        {
          invalid_type_error: PARAMS.INVALID_TYPE_ERROR_MESSAGE,
          required_error: PARAMS.REQUIRED_ERROR_MESSAGE,
        },
      ),
    },
    DELETE: zod.object(
      {
        hall_id: zod
          .string({
            invalid_type_error: HALL.ID.INVALID_TYPE_ERROR_MESSAGE,
            required_error: HALL.ID.REQUIRED_ERROR_MESSAGE,
          })
          .uuid(HALL.ID.ERROR_MESSAGE),
      },
      {
        invalid_type_error: PARAMS.INVALID_TYPE_ERROR_MESSAGE,
        required_error: PARAMS.REQUIRED_ERROR_MESSAGE,
      },
    ),
  },
  HEALTHCHECK: zod
    .string({
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
      zod.enum(HEALTHCHECK.HTTP_METHODS.NAMES, {
        errorMap: () => {
          return {
            message: HEALTHCHECK.HTTP_METHODS.ERROR_MESSAGE,
          } as const;
        },
      }),
    ),
  MOVIE: {
    READ: {
      MANY: zod
        .object(
          {
            cursor: zod
              .string({
                invalid_type_error:
                  PAGINATION.CURSOR.INVALID_TYPE_ERROR_MESSAGE,
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
            const { id, createdAt } = cursorSchema.parse(
              decodeCursor(val.cursor),
            );

            return {
              cursor: { id, createdAt },
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
          movie_id: zod
            .string({
              invalid_type_error: MOVIE.ID.INVALID_TYPE_ERROR_MESSAGE,
              required_error: MOVIE.ID.REQUIRED_ERROR_MESSAGE,
            })
            .uuid(MOVIE.ID.ERROR_MESSAGE),
        },
        {
          invalid_type_error: PARAMS.INVALID_TYPE_ERROR_MESSAGE,
          required_error: PARAMS.REQUIRED_ERROR_MESSAGE,
        },
      ),
    },
    CREATE: zod.object({
      title: zod
        .string({
          invalid_type_error: MOVIE.TITLE.INVALID_TYPE_ERROR_MESSAGE,
          required_error: MOVIE.TITLE.REQUIRED_ERROR_MESSAGE,
        })
        .min(MOVIE.TITLE.MIN_LENGTH.VALUE, MOVIE.TITLE.MIN_LENGTH.ERROR_MESSAGE)
        .max(
          MOVIE.TITLE.MAX_LENGTH.VALUE,
          MOVIE.TITLE.MAX_LENGTH.ERROR_MESSAGE,
        ),
      description: zod
        .string({
          invalid_type_error: MOVIE.DESCRIPTION.INVALID_TYPE_ERROR_MESSAGE,
          required_error: MOVIE.DESCRIPTION.REQUIRED_ERROR_MESSAGE,
        })
        .min(
          MOVIE.DESCRIPTION.MIN_LENGTH.VALUE,
          MOVIE.DESCRIPTION.MIN_LENGTH.ERROR_MESSAGE,
        )
        .max(
          MOVIE.DESCRIPTION.MAX_LENGTH.VALUE,
          MOVIE.DESCRIPTION.MAX_LENGTH.ERROR_MESSAGE,
        ),
      poster: zod
        .object(
          {
            path: zod
              .string({
                invalid_type_error:
                  MOVIE.POSTER.ABSOLUTE_FILE_PATH.INVALID_TYPE_ERROR_MESSAGE,
                required_error:
                  MOVIE.POSTER.ABSOLUTE_FILE_PATH.REQUIRED_ERROR_MESSAGE,
              })
              .min(
                MOVIE.POSTER.ABSOLUTE_FILE_PATH.MIN_LENGTH.VALUE,
                MOVIE.POSTER.ABSOLUTE_FILE_PATH.MIN_LENGTH.ERROR_MESSAGE,
              )
              .max(
                MOVIE.POSTER.ABSOLUTE_FILE_PATH.MAX_LENGTH.VALUE,
                MOVIE.POSTER.ABSOLUTE_FILE_PATH.MAX_LENGTH.ERROR_MESSAGE,
              ),
            mimeType: zod
              .string({
                invalid_type_error:
                  MOVIE.POSTER.MIME_TYPE.INVALID_TYPE_ERROR_MESSAGE,
                required_error: MOVIE.POSTER.MIME_TYPE.REQUIRED_ERROR_MESSAGE,
              })
              .nonempty(MOVIE.POSTER.MIME_TYPE.REQUIRED_ERROR_MESSAGE),
            size: zod
              .number({
                invalid_type_error:
                  MOVIE.POSTER.FILE_SIZE.INVALID_TYPE_ERROR_MESSAGE,
                required_error: MOVIE.POSTER.FILE_SIZE.REQUIRED_ERROR_MESSAGE,
              })
              .min(
                MOVIE.POSTER.FILE_SIZE.MIN_VALUE.VALUE,
                MOVIE.POSTER.FILE_SIZE.MIN_VALUE.ERROR_MESSAGE,
              )
              .max(
                MOVIE.POSTER.FILE_SIZE.MAX_VALUE.VALUE,
                MOVIE.POSTER.FILE_SIZE.MAX_VALUE.ERROR_MESSAGE,
              ),
          },
          {
            invalid_type_error: MOVIE.POSTER.INVALID_TYPE_ERROR_MESSAGE,
            required_error: MOVIE.POSTER.REQUIRED_ERROR_MESSAGE,
          },
        )
        .transform((val) => {
          const { path, size, ...fields } = val;

          return {
            ...fields,
            absolutePath: path,
            sizeInBytes: size,
          };
        }),
      price: zod.preprocess(
        coerceNumber(
          MOVIE.PRICE.INVALID_TYPE_ERROR_MESSAGE,
          MOVIE.PRICE.REQUIRED_ERROR_MESSAGE,
        ),
        zod
          .number()
          .min(MOVIE.PRICE.MIN_VALUE.VALUE, MOVIE.PRICE.MIN_VALUE.ERROR_MESSAGE)
          .max(
            MOVIE.PRICE.MAX_VALUE.VALUE,
            MOVIE.PRICE.MAX_VALUE.ERROR_MESSAGE,
          ),
      ),
      genreId: zod
        .string({
          invalid_type_error: GENRE.ID.INVALID_TYPE_ERROR_MESSAGE,
          required_error: GENRE.ID.REQUIRED_ERROR_MESSAGE,
        })
        .uuid(GENRE.ID.ERROR_MESSAGE),
    }),
    UPDATE: {
      BODY: zod
        .object({
          title: zod
            .string({
              invalid_type_error: MOVIE.TITLE.INVALID_TYPE_ERROR_MESSAGE,
              required_error: MOVIE.TITLE.REQUIRED_ERROR_MESSAGE,
            })
            .min(
              MOVIE.TITLE.MIN_LENGTH.VALUE,
              MOVIE.TITLE.MIN_LENGTH.ERROR_MESSAGE,
            )
            .max(
              MOVIE.TITLE.MAX_LENGTH.VALUE,
              MOVIE.TITLE.MAX_LENGTH.ERROR_MESSAGE,
            )
            .optional(),
          description: zod
            .string({
              invalid_type_error: MOVIE.DESCRIPTION.INVALID_TYPE_ERROR_MESSAGE,
              required_error: MOVIE.DESCRIPTION.REQUIRED_ERROR_MESSAGE,
            })
            .min(
              MOVIE.DESCRIPTION.MIN_LENGTH.VALUE,
              MOVIE.DESCRIPTION.MIN_LENGTH.ERROR_MESSAGE,
            )
            .max(
              MOVIE.DESCRIPTION.MAX_LENGTH.VALUE,
              MOVIE.DESCRIPTION.MAX_LENGTH.ERROR_MESSAGE,
            )
            .optional(),
          poster: zod
            .object(
              {
                path: zod
                  .string({
                    invalid_type_error:
                      MOVIE.POSTER.ABSOLUTE_FILE_PATH
                        .INVALID_TYPE_ERROR_MESSAGE,
                    required_error:
                      MOVIE.POSTER.ABSOLUTE_FILE_PATH.REQUIRED_ERROR_MESSAGE,
                  })
                  .min(
                    MOVIE.POSTER.ABSOLUTE_FILE_PATH.MIN_LENGTH.VALUE,
                    MOVIE.POSTER.ABSOLUTE_FILE_PATH.MIN_LENGTH.ERROR_MESSAGE,
                  )
                  .max(
                    MOVIE.POSTER.ABSOLUTE_FILE_PATH.MAX_LENGTH.VALUE,
                    MOVIE.POSTER.ABSOLUTE_FILE_PATH.MAX_LENGTH.ERROR_MESSAGE,
                  ),
                mimeType: zod
                  .string({
                    invalid_type_error:
                      MOVIE.POSTER.MIME_TYPE.INVALID_TYPE_ERROR_MESSAGE,
                    required_error:
                      MOVIE.POSTER.MIME_TYPE.REQUIRED_ERROR_MESSAGE,
                  })
                  .nonempty(MOVIE.POSTER.MIME_TYPE.REQUIRED_ERROR_MESSAGE),
                size: zod
                  .number({
                    invalid_type_error:
                      MOVIE.POSTER.FILE_SIZE.INVALID_TYPE_ERROR_MESSAGE,
                    required_error:
                      MOVIE.POSTER.FILE_SIZE.REQUIRED_ERROR_MESSAGE,
                  })
                  .min(
                    MOVIE.POSTER.FILE_SIZE.MIN_VALUE.VALUE,
                    MOVIE.POSTER.FILE_SIZE.MIN_VALUE.ERROR_MESSAGE,
                  )
                  .max(
                    MOVIE.POSTER.FILE_SIZE.MAX_VALUE.VALUE,
                    MOVIE.POSTER.FILE_SIZE.MAX_VALUE.ERROR_MESSAGE,
                  ),
              },
              {
                invalid_type_error: MOVIE.POSTER.INVALID_TYPE_ERROR_MESSAGE,
                required_error: MOVIE.POSTER.REQUIRED_ERROR_MESSAGE,
              },
            )
            .transform((val) => {
              const { path, size, ...fields } = val;

              return {
                ...fields,
                absolutePath: path,
                sizeInBytes: size,
              };
            })
            .optional(),
          price: zod
            .preprocess(
              coerceNumber(MOVIE.PRICE.INVALID_TYPE_ERROR_MESSAGE),
              zod
                .number()
                .min(
                  MOVIE.PRICE.MIN_VALUE.VALUE,
                  MOVIE.PRICE.MIN_VALUE.ERROR_MESSAGE,
                )
                .max(
                  MOVIE.PRICE.MAX_VALUE.VALUE,
                  MOVIE.PRICE.MAX_VALUE.ERROR_MESSAGE,
                ),
            )
            .optional(),
          genreId: zod
            .string({
              invalid_type_error: GENRE.ID.INVALID_TYPE_ERROR_MESSAGE,
              required_error: GENRE.ID.REQUIRED_ERROR_MESSAGE,
            })
            .uuid(GENRE.ID.ERROR_MESSAGE)
            .optional(),
        })
        .superRefine((movieUpdates, context) => {
          if (!Object.keys(movieUpdates).length) {
            context.addIssue({
              code: ZodIssueCode.custom,
              message: MOVIE.NO_FIELDS_TO_UPDATE_ERROR_MESSAGE,
              fatal: true,
            });
          }
        }),
      PARAMS: zod.object(
        {
          movie_id: zod
            .string({
              invalid_type_error: MOVIE.ID.INVALID_TYPE_ERROR_MESSAGE,
              required_error: MOVIE.ID.REQUIRED_ERROR_MESSAGE,
            })
            .uuid(MOVIE.ID.ERROR_MESSAGE),
        },
        {
          invalid_type_error: PARAMS.INVALID_TYPE_ERROR_MESSAGE,
          required_error: PARAMS.REQUIRED_ERROR_MESSAGE,
        },
      ),
    },
    DELETE: zod.object(
      {
        movie_id: zod
          .string({
            invalid_type_error: MOVIE.ID.INVALID_TYPE_ERROR_MESSAGE,
            required_error: MOVIE.ID.REQUIRED_ERROR_MESSAGE,
          })
          .uuid(MOVIE.ID.ERROR_MESSAGE),
      },
      {
        invalid_type_error: PARAMS.INVALID_TYPE_ERROR_MESSAGE,
        required_error: PARAMS.REQUIRED_ERROR_MESSAGE,
      },
    ),
  },
  MOVIE_POSTER: {
    READ: zod.object(
      {
        movie_id: zod
          .string({
            invalid_type_error: MOVIE.ID.INVALID_TYPE_ERROR_MESSAGE,
            required_error: MOVIE.ID.REQUIRED_ERROR_MESSAGE,
          })
          .uuid(MOVIE.ID.ERROR_MESSAGE),
      },
      {
        invalid_type_error: PARAMS.INVALID_TYPE_ERROR_MESSAGE,
        required_error: PARAMS.REQUIRED_ERROR_MESSAGE,
      },
    ),
  },
  ROLE: {
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
              .min(
                ROLE.NAME.MIN_LENGTH.VALUE,
                ROLE.NAME.MIN_LENGTH.ERROR_MESSAGE,
              )
              .max(
                ROLE.NAME.MAX_LENGTH.VALUE,
                ROLE.NAME.MAX_LENGTH.ERROR_MESSAGE,
              )
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
  },
  SHOWTIME: {
    READ: zod
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
          'movie-id': zod
            .string({
              invalid_type_error: SHOWTIME.MOVIE_ID.INVALID_TYPE_ERROR_MESSAGE,
            })
            .uuid(SHOWTIME.MOVIE_ID.ERROR_MESSAGE)
            .optional(),
          'hall-id': zod
            .string({
              invalid_type_error: SHOWTIME.HALL_ID.INVALID_TYPE_ERROR_MESSAGE,
            })
            .uuid(SHOWTIME.HALL_ID.ERROR_MESSAGE)
            .optional(),
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
            movieId: val['movie-id'],
            hallId: val['hall-id'],
          } as const;
        }

        try {
          const { id: showtimeId, createdAt } = cursorSchema.parse(
            decodeCursor(val.cursor),
          );

          return {
            cursor: { showtimeId, createdAt },
            pageSize: val['page-size'],
            movieId: val['movie-id'],
            hallId: val['hall-id'],
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
    CREATE: zod.object(
      {
        id: zod
          .string({
            invalid_type_error: SHOWTIME.ID.INVALID_TYPE_ERROR_MESSAGE,
          })
          .uuid(SHOWTIME.ID.ERROR_MESSAGE)
          .optional(),
        at: zod.coerce
          .date({
            errorMap: ({ code }, { defaultError }) => {
              switch (code) {
                case 'invalid_date':
                  return { message: SHOWTIME.AT.INVALID_TYPE_ERROR_MESSAGE };
                default:
                  return { message: defaultError };
              }
            },
          })
          .min(
            new Date(SHOWTIME.AT.MIN_VALUE.VALUE()),
            SHOWTIME.AT.MIN_VALUE.ERROR_MESSAGE,
          ),
        movieId: zod
          .string({
            invalid_type_error: SHOWTIME.MOVIE_ID.INVALID_TYPE_ERROR_MESSAGE,
            required_error: SHOWTIME.MOVIE_ID.REQUIRED_ERROR_MESSAGE,
          })
          .uuid(SHOWTIME.MOVIE_ID.ERROR_MESSAGE),
        hallId: zod
          .string({
            invalid_type_error: SHOWTIME.HALL_ID.INVALID_TYPE_ERROR_MESSAGE,
            required_error: SHOWTIME.HALL_ID.REQUIRED_ERROR_MESSAGE,
          })
          .uuid(SHOWTIME.HALL_ID.ERROR_MESSAGE),
      },
      {
        invalid_type_error: BODY.INVALID_TYPE_ERROR_MESSAGE,
        required_error: BODY.REQUIRED_ERROR_MESSAGE,
      },
    ),
    DELETE: zod.object(
      {
        showtime_id: zod
          .string({
            invalid_type_error: SHOWTIME.ID.INVALID_TYPE_ERROR_MESSAGE,
            required_error: SHOWTIME.ID.REQUIRED_ERROR_MESSAGE,
          })
          .uuid(SHOWTIME.ID.ERROR_MESSAGE),
      },
      {
        invalid_type_error: PARAMS.INVALID_TYPE_ERROR_MESSAGE,
        required_error: PARAMS.REQUIRED_ERROR_MESSAGE,
      },
    ),
    RESERVER: zod.object(
      {
        showtime_id: zod
          .string({
            invalid_type_error: SHOWTIME.ID.INVALID_TYPE_ERROR_MESSAGE,
            required_error: SHOWTIME.ID.REQUIRED_ERROR_MESSAGE,
          })
          .uuid(SHOWTIME.ID.ERROR_MESSAGE),
        row: zod.preprocess(
          coerceNumber(
            SHOWTIME.ROWS.INVALID_TYPE_ERROR_MESSAGE,
            SHOWTIME.ROWS.REQUIRED_ERROR_MESSAGE,
          ),
          zod
            .number()
            .min(
              HALL.ROWS.MIN_LENGTH.VALUE,
              SHOWTIME.ROWS.MIN_LENGTH(HALL.ROWS.MIN_LENGTH.VALUE),
            )
            .max(
              HALL.ROWS.MAX_LENGTH.VALUE,
              SHOWTIME.ROWS.MAX_LENGTH(HALL.ROWS.MAX_LENGTH.VALUE),
            ),
        ),
        column: zod.preprocess(
          coerceNumber(
            SHOWTIME.COLUMNS.INVALID_TYPE_ERROR_MESSAGE,
            SHOWTIME.COLUMNS.REQUIRED_ERROR_MESSAGE,
          ),
          zod
            .number()
            .min(
              HALL.COLUMNS.MIN_LENGTH.VALUE,
              SHOWTIME.COLUMNS.MIN_LENGTH(HALL.COLUMNS.MIN_LENGTH.VALUE),
            )
            .max(
              HALL.COLUMNS.MAX_LENGTH.VALUE,
              SHOWTIME.COLUMNS.MAX_LENGTH(HALL.COLUMNS.MAX_LENGTH.VALUE),
            ),
        ),
      },
      {
        invalid_type_error: BODY.INVALID_TYPE_ERROR_MESSAGE,
        required_error: BODY.REQUIRED_ERROR_MESSAGE,
      },
    ),
    CANCEL: zod.object(
      {
        showtime_id: zod
          .string({
            invalid_type_error: SHOWTIME.ID.INVALID_TYPE_ERROR_MESSAGE,
            required_error: SHOWTIME.ID.REQUIRED_ERROR_MESSAGE,
          })
          .uuid(SHOWTIME.ID.ERROR_MESSAGE),
      },
      {
        invalid_type_error: BODY.INVALID_TYPE_ERROR_MESSAGE,
        required_error: BODY.REQUIRED_ERROR_MESSAGE,
      },
    ),
    USER: {
      READ: {
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
        QUERY: zod
          .object(
            {
              cursor: zod
                .string({
                  invalid_type_error:
                    PAGINATION.CURSOR.INVALID_TYPE_ERROR_MESSAGE,
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
              const { id, createdAt } = cursorSchema.parse(
                decodeCursor(val.cursor),
              );

              return {
                cursor: { id, createdAt },
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
      },
    },
  },
  USER: {
    READ: {
      MANY: zod
        .object(
          {
            cursor: zod
              .string({
                invalid_type_error:
                  PAGINATION.CURSOR.INVALID_TYPE_ERROR_MESSAGE,
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
            .min(
              USER.EMAIL.MIN_LENGTH.VALUE,
              USER.EMAIL.MIN_LENGTH.ERROR_MESSAGE,
            )
            .max(
              USER.EMAIL.MAX_LENGTH.VALUE,
              USER.EMAIL.MAX_LENGTH.ERROR_MESSAGE,
            )
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
  },
};

/**********************************************************************************/

export { SCHEMAS, VALIDATION, parseValidationResult };
