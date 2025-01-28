import type { Request } from 'express';
import {
  coerce as ZodCoerce,
  ZodIssueCode,
  NEVER as ZodNever,
  number as ZodNumber,
  object as ZodObject,
  preprocess as ZodPreprocessor,
  string as ZodString,
} from 'zod';

import { decodeCursor } from '../../utils/index.js';

import {
  coerceNumber,
  cursorSchema,
  parseValidationResult,
  VALIDATION,
} from '../utils.validator.js';

/**********************************************************************************/

const { SHOWTIME, HALL, USER, PAGINATION, QUERY, PARAMS, BODY } = VALIDATION;

/**********************************************************************************/

const getShowtimesSchema = ZodObject(
  {
    cursor: ZodString({
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
    'page-size': ZodPreprocessor(
      coerceNumber(PAGINATION.PAGE_SIZE.INVALID_TYPE_ERROR_MESSAGE),
      ZodNumber()
        .min(
          PAGINATION.PAGE_SIZE.MIN_LENGTH.VALUE,
          PAGINATION.PAGE_SIZE.MIN_LENGTH.ERROR_MESSAGE,
        )
        .max(
          PAGINATION.PAGE_SIZE.MAX_LENGTH.VALUE,
          PAGINATION.PAGE_SIZE.MAX_LENGTH.ERROR_MESSAGE,
        ),
    ).default(PAGINATION.PAGE_SIZE.DEFAULT_VALUE),
    'movie-id': ZodString({
      invalid_type_error: SHOWTIME.MOVIE_ID.INVALID_TYPE_ERROR_MESSAGE,
    })
      .uuid(SHOWTIME.MOVIE_ID.ERROR_MESSAGE)
      .optional(),
    'hall-id': ZodString({
      invalid_type_error: SHOWTIME.HALL_ID.INVALID_TYPE_ERROR_MESSAGE,
    })
      .uuid(SHOWTIME.HALL_ID.ERROR_MESSAGE)
      .optional(),
  },
  {
    invalid_type_error: QUERY.INVALID_TYPE_ERROR_MESSAGE,
    required_error: QUERY.REQUIRED_ERROR_MESSAGE,
  },
).transform((val, context) => {
  if (!val.cursor || val.cursor === 'undefined' || val.cursor === 'null') {
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

  return ZodNever;
});

const createShowtimeSchema = ZodObject(
  {
    id: ZodString({
      invalid_type_error: SHOWTIME.ID.INVALID_TYPE_ERROR_MESSAGE,
    })
      .uuid(SHOWTIME.ID.ERROR_MESSAGE)
      .optional(),
    at: ZodCoerce.date({
      errorMap: ({ code }, { defaultError }) => {
        switch (code) {
          case 'invalid_date':
            return { message: SHOWTIME.AT.INVALID_TYPE_ERROR_MESSAGE };
          default:
            return { message: defaultError };
        }
      },
    }).min(
      new Date(SHOWTIME.AT.MIN_VALUE.VALUE()),
      SHOWTIME.AT.MIN_VALUE.ERROR_MESSAGE,
    ),
    movieId: ZodString({
      invalid_type_error: SHOWTIME.MOVIE_ID.INVALID_TYPE_ERROR_MESSAGE,
      required_error: SHOWTIME.MOVIE_ID.REQUIRED_ERROR_MESSAGE,
    }).uuid(SHOWTIME.MOVIE_ID.ERROR_MESSAGE),
    hallId: ZodString({
      invalid_type_error: SHOWTIME.HALL_ID.INVALID_TYPE_ERROR_MESSAGE,
      required_error: SHOWTIME.HALL_ID.REQUIRED_ERROR_MESSAGE,
    }).uuid(SHOWTIME.HALL_ID.ERROR_MESSAGE),
  },
  {
    invalid_type_error: BODY.INVALID_TYPE_ERROR_MESSAGE,
    required_error: BODY.REQUIRED_ERROR_MESSAGE,
  },
);

const deleteShowtimeSchema = ZodObject(
  {
    showtime_id: ZodString({
      invalid_type_error: SHOWTIME.ID.INVALID_TYPE_ERROR_MESSAGE,
      required_error: SHOWTIME.ID.REQUIRED_ERROR_MESSAGE,
    }).uuid(SHOWTIME.ID.ERROR_MESSAGE),
  },
  {
    invalid_type_error: PARAMS.INVALID_TYPE_ERROR_MESSAGE,
    required_error: PARAMS.REQUIRED_ERROR_MESSAGE,
  },
);

const reserveShowtimeTicketSchema = ZodObject(
  {
    showtime_id: ZodString({
      invalid_type_error: SHOWTIME.ID.INVALID_TYPE_ERROR_MESSAGE,
      required_error: SHOWTIME.ID.REQUIRED_ERROR_MESSAGE,
    }).uuid(SHOWTIME.ID.ERROR_MESSAGE),
    row: ZodPreprocessor(
      coerceNumber(
        SHOWTIME.ROWS.INVALID_TYPE_ERROR_MESSAGE,
        SHOWTIME.ROWS.REQUIRED_ERROR_MESSAGE,
      ),
      ZodNumber()
        .min(
          HALL.ROWS.MIN_LENGTH.VALUE,
          SHOWTIME.ROWS.MIN_LENGTH(HALL.ROWS.MIN_LENGTH.VALUE),
        )
        .max(
          HALL.ROWS.MAX_LENGTH.VALUE,
          SHOWTIME.ROWS.MAX_LENGTH(HALL.ROWS.MAX_LENGTH.VALUE),
        ),
    ),
    column: ZodPreprocessor(
      coerceNumber(
        SHOWTIME.COLUMNS.INVALID_TYPE_ERROR_MESSAGE,
        SHOWTIME.COLUMNS.REQUIRED_ERROR_MESSAGE,
      ),
      ZodNumber()
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
);

const cancelUserShowtimeReservationSchema = ZodObject(
  {
    showtime_id: ZodString({
      invalid_type_error: SHOWTIME.ID.INVALID_TYPE_ERROR_MESSAGE,
      required_error: SHOWTIME.ID.REQUIRED_ERROR_MESSAGE,
    }).uuid(SHOWTIME.ID.ERROR_MESSAGE),
  },
  {
    invalid_type_error: BODY.INVALID_TYPE_ERROR_MESSAGE,
    required_error: BODY.REQUIRED_ERROR_MESSAGE,
  },
);

const getUserShowtimesParamsSchema = ZodObject(
  {
    user_id: ZodString({
      invalid_type_error: USER.ID.INVALID_TYPE_ERROR_MESSAGE,
      required_error: USER.ID.REQUIRED_ERROR_MESSAGE,
    }).uuid(USER.ID.ERROR_MESSAGE),
  },
  {
    invalid_type_error: PARAMS.INVALID_TYPE_ERROR_MESSAGE,
    required_error: PARAMS.REQUIRED_ERROR_MESSAGE,
  },
);

const getUserShowtimesQuerySchema = ZodObject(
  {
    cursor: ZodString({
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
    'page-size': ZodPreprocessor(
      coerceNumber(PAGINATION.PAGE_SIZE.INVALID_TYPE_ERROR_MESSAGE),
      ZodNumber()
        .min(
          PAGINATION.PAGE_SIZE.MIN_LENGTH.VALUE,
          PAGINATION.PAGE_SIZE.MIN_LENGTH.ERROR_MESSAGE,
        )
        .max(
          PAGINATION.PAGE_SIZE.MAX_LENGTH.VALUE,
          PAGINATION.PAGE_SIZE.MAX_LENGTH.ERROR_MESSAGE,
        ),
    ).default(PAGINATION.PAGE_SIZE.DEFAULT_VALUE),
  },
  {
    invalid_type_error: QUERY.INVALID_TYPE_ERROR_MESSAGE,
    required_error: QUERY.REQUIRED_ERROR_MESSAGE,
  },
).transform((val, context) => {
  if (!val.cursor || val.cursor === 'undefined' || val.cursor === 'null') {
    return {
      pageSize: val['page-size'],
    } as const;
  }

  try {
    const { id, createdAt } = cursorSchema.parse(decodeCursor(val.cursor));

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

  return ZodNever;
});

/**********************************************************************************/

function validateGetShowtimes(req: Request) {
  const { query } = req;

  const validatedResult = getShowtimesSchema.safeParse(query);
  const parsedValidatedResult = parseValidationResult(validatedResult);

  return parsedValidatedResult;
}

function validateCreateShowtime(req: Request) {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const { body } = req;

  const validatedResult = createShowtimeSchema.safeParse(body);
  const parsedValidatedResult = parseValidationResult(validatedResult);

  return parsedValidatedResult;
}

function validateDeleteShowtime(req: Request) {
  const { params } = req;

  const validatedResult = deleteShowtimeSchema.safeParse(params);
  const { showtime_id: showtimeId } = parseValidationResult(validatedResult);

  return showtimeId;
}

function validateReserveShowtimeTicket(req: Request) {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const { body } = req;

  const validatedResult = reserveShowtimeTicketSchema.safeParse(body);
  const {
    showtime_id: showtimeId,
    row,
    column,
  } = parseValidationResult(validatedResult);

  return {
    showtimeId,
    row,
    column,
  } as const;
}

function validateCancelUserShowtimeReservation(req: Request) {
  const { params } = req;

  const validatedResult = cancelUserShowtimeReservationSchema.safeParse(params);
  const { showtime_id: showtimeId } = parseValidationResult(validatedResult);

  return showtimeId;
}

function validateGetUserShowtimes(req: Request) {
  const { params, query } = req;

  const validatedParamsResult = getUserShowtimesParamsSchema.safeParse(params);
  const { user_id: userId } = parseValidationResult(validatedParamsResult);
  const validatedQueryResult = getUserShowtimesQuerySchema.safeParse(query);
  const { cursor, pageSize } = parseValidationResult(validatedQueryResult);

  return {
    userId,
    cursor,
    pageSize,
  } as const;
}

/**********************************************************************************/

export {
  validateCancelUserShowtimeReservation,
  validateCreateShowtime,
  validateDeleteShowtime,
  validateGetShowtimes,
  validateGetUserShowtimes,
  validateReserveShowtimeTicket,
};
