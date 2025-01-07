import {
  type Request,
  decodeCursor,
  HTTP_STATUS_CODES,
  Zod,
} from '../../utils/index.js';

import {
  coerceNumber,
  cursorSchema,
  parseValidationResult,
  VALIDATION,
} from '../utils.validator.js';

/**********************************************************************************/

const { SHOWTIME, PAGINATION, QUERY, PARAMS, BODY } = VALIDATION;

/**********************************************************************************/

const getShowtimesSchema = Zod.object(
  {
    cursor: Zod.string({
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
    'page-size': Zod.preprocess(
      coerceNumber(PAGINATION.PAGE_SIZE.INVALID_TYPE_ERROR_MESSAGE),
      Zod.number()
        .min(
          PAGINATION.PAGE_SIZE.MIN_LENGTH.VALUE,
          PAGINATION.PAGE_SIZE.MIN_LENGTH.ERROR_MESSAGE,
        )
        .max(
          PAGINATION.PAGE_SIZE.MAX_LENGTH.VALUE,
          PAGINATION.PAGE_SIZE.MAX_LENGTH.ERROR_MESSAGE,
        ),
    ).default(PAGINATION.PAGE_SIZE.DEFAULT_VALUE),
    'movie-id': Zod.string({
      invalid_type_error: SHOWTIME.MOVIE_ID.INVALID_TYPE_ERROR_MESSAGE,
    })
      .uuid(SHOWTIME.MOVIE_ID.ERROR_MESSAGE)
      .optional(),
    'hall-id': Zod.string({
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
      code: Zod.ZodIssueCode.custom,
      message: PAGINATION.CURSOR.ERROR_MESSAGE,
      fatal: true,
    });
  }

  return Zod.NEVER;
});

const createShowtimeSchema = Zod.object(
  {
    id: Zod.string({
      invalid_type_error: SHOWTIME.ID.INVALID_TYPE_ERROR_MESSAGE,
    })
      .uuid(SHOWTIME.ID.ERROR_MESSAGE)
      .optional(),
    at: Zod.coerce
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
    movieId: Zod.string({
      invalid_type_error: SHOWTIME.MOVIE_ID.INVALID_TYPE_ERROR_MESSAGE,
      required_error: SHOWTIME.MOVIE_ID.REQUIRED_ERROR_MESSAGE,
    }).uuid(SHOWTIME.MOVIE_ID.ERROR_MESSAGE),
    hallId: Zod.string({
      invalid_type_error: SHOWTIME.HALL_ID.INVALID_TYPE_ERROR_MESSAGE,
      required_error: SHOWTIME.HALL_ID.REQUIRED_ERROR_MESSAGE,
    }).uuid(SHOWTIME.HALL_ID.ERROR_MESSAGE),
  },
  {
    invalid_type_error: BODY.INVALID_TYPE_ERROR_MESSAGE,
    required_error: BODY.REQUIRED_ERROR_MESSAGE,
  },
);

const deleteShowtimeSchema = Zod.object(
  {
    showtime_id: Zod.string({
      invalid_type_error: SHOWTIME.ID.INVALID_TYPE_ERROR_MESSAGE,
      required_error: SHOWTIME.ID.REQUIRED_ERROR_MESSAGE,
    }).uuid(SHOWTIME.ID.ERROR_MESSAGE),
  },
  {
    invalid_type_error: PARAMS.INVALID_TYPE_ERROR_MESSAGE,
    required_error: PARAMS.REQUIRED_ERROR_MESSAGE,
  },
);

/**********************************************************************************/

function validateGetShowtimes(req: Request) {
  const { query } = req;

  const validatedResult = getShowtimesSchema.safeParse(query);
  const parsedValidatedResult = parseValidationResult(
    validatedResult,
    HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
  );

  return parsedValidatedResult;
}

function validateCreateShowtime(req: Request) {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const { body } = req;

  const validatedResult = createShowtimeSchema.safeParse(body);
  const parsedValidatedResult = parseValidationResult(
    validatedResult,
    HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
  );

  return parsedValidatedResult;
}

function validateDeleteShowtime(req: Request) {
  const { params } = req;

  const validatedResult = deleteShowtimeSchema.safeParse(params);
  const { showtime_id: showtimeId } = parseValidationResult(
    validatedResult,
    HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
  );

  return showtimeId;
}

/**********************************************************************************/

export { validateCreateShowtime, validateDeleteShowtime, validateGetShowtimes };
