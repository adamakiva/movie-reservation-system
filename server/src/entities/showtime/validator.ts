import type { Request } from 'express';
import zod, { ZodIssueCode } from 'zod';

import {
  coerceNumber,
  CURSOR_SCHEMA,
  decodeCursor,
  parseValidationResult,
  VALIDATION,
} from '../utils.ts';

/**********************************************************************************/

const { PAGINATION, QUERY, BODY, PARAMS } = VALIDATION;

const USER = {
  ID: {
    INVALID_TYPE_ERROR_MESSAGE: 'User id must be a string',
    REQUIRED_ERROR_MESSAGE: 'User id is required',
    ERROR_MESSAGE: 'User id must be a valid UUIDV4',
  },
} as const;

const SHOWTIME = {
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
    INVALID_TYPE_ERROR_MESSAGE: 'Column must be a number',
    REQUIRED_ERROR_MESSAGE: 'Column is required',
    MIN_LENGTH: {
      VALUE: 1,
      ERROR_MESSAGE: 'Hall columns must be at least 1',
    },
    MAX_LENGTH: {
      VALUE: 64,
      ERROR_MESSAGE: 'Hall columns must be at most 64',
    },
  },
} as const;

const SHOWTIME_SCHEMAS = {
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
      if (!val.cursor || val.cursor === 'undefined' || val.cursor === 'null') {
        return {
          pageSize: val['page-size'],
          movieId: val['movie-id'],
          hallId: val['hall-id'],
        } as const;
      }

      try {
        const { id: showtimeId, createdAt } = CURSOR_SCHEMA.parse(
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
  RESERVE: zod.object(
    {
      showtimeId: zod
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
            SHOWTIME.ROWS.MIN_LENGTH.VALUE,
            SHOWTIME.ROWS.MIN_LENGTH.ERROR_MESSAGE,
          )
          .max(
            SHOWTIME.ROWS.MAX_LENGTH.VALUE,
            SHOWTIME.ROWS.MAX_LENGTH.ERROR_MESSAGE,
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
            SHOWTIME.COLUMNS.MIN_LENGTH.VALUE,
            SHOWTIME.COLUMNS.MIN_LENGTH.ERROR_MESSAGE,
          )
          .max(
            SHOWTIME.COLUMNS.MAX_LENGTH.VALUE,
            SHOWTIME.COLUMNS.MAX_LENGTH.ERROR_MESSAGE,
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
      user_id: zod
        .string({
          invalid_type_error: USER.ID.INVALID_TYPE_ERROR_MESSAGE,
          required_error: USER.ID.REQUIRED_ERROR_MESSAGE,
        })
        .uuid(USER.ID.ERROR_MESSAGE),
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
            const { id, createdAt } = CURSOR_SCHEMA.parse(
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
} as const;

/**********************************************************************************/

function validateGetShowtimes(request: Request) {
  const validatedResult = parseValidationResult(
    SHOWTIME_SCHEMAS.READ.safeParse(request.query),
  );

  return validatedResult;
}

function validateGetUserShowtimes(request: Request) {
  const { user_id: userId } = parseValidationResult(
    SHOWTIME_SCHEMAS.USER.READ.PARAMS.safeParse(request.params),
  );
  const { cursor, pageSize } = parseValidationResult(
    SHOWTIME_SCHEMAS.USER.READ.QUERY.safeParse(request.query),
  );

  return {
    userId,
    cursor,
    pageSize,
  } as const;
}

function validateCreateShowtime(request: Request) {
  const validatedResult = parseValidationResult(
    SHOWTIME_SCHEMAS.CREATE.safeParse(request.body),
  );

  return validatedResult;
}

function validateReserveShowtimeTicket(request: Request) {
  const { showtimeId, row, column } = parseValidationResult(
    SHOWTIME_SCHEMAS.RESERVE.safeParse(request.body),
  );

  return {
    showtimeId,
    row,
    column,
  } as const;
}

function validateDeleteShowtime(request: Request) {
  const { showtime_id: showtimeId } = parseValidationResult(
    SHOWTIME_SCHEMAS.DELETE.safeParse(request.params),
  );

  return showtimeId;
}

function validateCancelUserShowtimeReservation(request: Request) {
  const { showtime_id: showtimeId } = parseValidationResult(
    SHOWTIME_SCHEMAS.CANCEL.safeParse(request.params),
  );

  return showtimeId;
}

/**********************************************************************************/

export {
  SHOWTIME,
  validateCancelUserShowtimeReservation,
  validateCreateShowtime,
  validateDeleteShowtime,
  validateGetShowtimes,
  validateGetUserShowtimes,
  validateReserveShowtimeTicket,
};
