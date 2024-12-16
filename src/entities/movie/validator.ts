import {
  type Request,
  decodeCursor,
  HTTP_STATUS_CODES,
  Zod,
} from '../../utils/index.js';

import {
  cursorSchema,
  parseValidationResult,
  VALIDATION,
} from '../utils.validator.js';

const { GENRE, MOVIE, PAGINATION, PARAMS, QUERY } = VALIDATION;

/**********************************************************************************/

const getMoviesSchema = Zod.object(
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
    pageSize: Zod.coerce
      .number({
        invalid_type_error: PAGINATION.PAGE_SIZE.INVALID_TYPE_ERROR_MESSAGE,
      })
      .min(
        PAGINATION.PAGE_SIZE.MIN_LENGTH.VALUE,
        PAGINATION.PAGE_SIZE.MIN_LENGTH.ERROR_MESSAGE,
      )
      .max(
        PAGINATION.PAGE_SIZE.MAX_LENGTH.VALUE,
        PAGINATION.PAGE_SIZE.MAX_LENGTH.ERROR_MESSAGE,
      )
      .default(PAGINATION.PAGE_SIZE.DEFAULT_VALUE),
  },
  {
    invalid_type_error: QUERY.INVALID_TYPE_ERROR_MESSAGE,
    required_error: QUERY.REQUIRED_ERROR_MESSAGE,
  },
).transform(({ cursor, pageSize }, context) => {
  if (!cursor || cursor === 'undefined' || cursor === 'null') {
    return {
      pageSize,
    } as const;
  }

  try {
    const { id: movieId, createdAt } = cursorSchema.parse(decodeCursor(cursor));

    return {
      cursor: { movieId, createdAt },
      pageSize,
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

const getMovieSchema = Zod.object(
  {
    movieId: Zod.string({
      invalid_type_error: MOVIE.ID.INVALID_TYPE_ERROR_MESSAGE,
      required_error: MOVIE.ID.REQUIRED_ERROR_MESSAGE,
    }).uuid(MOVIE.ID.ERROR_MESSAGE),
  },
  {
    invalid_type_error: PARAMS.INVALID_TYPE_ERROR_MESSAGE,
    required_error: PARAMS.REQUIRED_ERROR_MESSAGE,
  },
);

const createMovieSchema = Zod.object({
  title: Zod.string({
    invalid_type_error: MOVIE.TITLE.INVALID_TYPE_ERROR_MESSAGE,
    required_error: MOVIE.TITLE.REQUIRED_ERROR_MESSAGE,
  })
    .min(MOVIE.TITLE.MIN_LENGTH.VALUE, MOVIE.TITLE.MIN_LENGTH.ERROR_MESSAGE)
    .max(MOVIE.TITLE.MAX_LENGTH.VALUE, MOVIE.TITLE.MAX_LENGTH.ERROR_MESSAGE),
  description: Zod.string({
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
  poster: Zod.object(
    {
      filename: Zod.string({
        invalid_type_error: MOVIE.POSTER.FILE_NAME.INVALID_TYPE_ERROR_MESSAGE,
        required_error: MOVIE.POSTER.FILE_NAME.REQUIRED_ERROR_MESSAGE,
      })
        .min(
          MOVIE.POSTER.FILE_NAME.MIN_LENGTH.VALUE,
          MOVIE.POSTER.FILE_NAME.MIN_LENGTH.ERROR_MESSAGE,
        )
        .max(
          MOVIE.POSTER.FILE_NAME.MAX_LENGTH.VALUE,
          MOVIE.POSTER.FILE_NAME.MAX_LENGTH.ERROR_MESSAGE,
        ),
      path: Zod.string({
        invalid_type_error: MOVIE.POSTER.FILE_PATH.INVALID_TYPE_ERROR_MESSAGE,
        required_error: MOVIE.POSTER.FILE_PATH.REQUIRED_ERROR_MESSAGE,
      })
        .min(
          MOVIE.POSTER.FILE_PATH.MIN_LENGTH.VALUE,
          MOVIE.POSTER.FILE_PATH.MIN_LENGTH.ERROR_MESSAGE,
        )
        .max(
          MOVIE.POSTER.FILE_PATH.MAX_LENGTH.VALUE,
          MOVIE.POSTER.FILE_PATH.MAX_LENGTH.ERROR_MESSAGE,
        ),
      size: Zod.coerce
        .number({
          invalid_type_error: MOVIE.POSTER.FILE_SIZE.INVALID_TYPE_ERROR_MESSAGE,
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
  ),
  price: Zod.coerce
    .number({
      invalid_type_error: MOVIE.PRICE.INVALID_TYPE_ERROR_MESSAGE,
      required_error: MOVIE.PRICE.REQUIRED_ERROR_MESSAGE,
    })
    .min(MOVIE.PRICE.MIN_VALUE.VALUE, MOVIE.PRICE.MIN_VALUE.ERROR_MESSAGE)
    .max(MOVIE.PRICE.MAX_VALUE.VALUE, MOVIE.PRICE.MAX_VALUE.ERROR_MESSAGE),
  genreId: Zod.string({
    invalid_type_error: GENRE.ID.INVALID_TYPE_ERROR_MESSAGE,
    required_error: GENRE.ID.REQUIRED_ERROR_MESSAGE,
  }).uuid(GENRE.ID.ERROR_MESSAGE),
});

const updateMovieBodySchema = Zod.object({
  title: Zod.string({
    invalid_type_error: MOVIE.TITLE.INVALID_TYPE_ERROR_MESSAGE,
    required_error: MOVIE.TITLE.REQUIRED_ERROR_MESSAGE,
  })
    .min(MOVIE.TITLE.MIN_LENGTH.VALUE, MOVIE.TITLE.MIN_LENGTH.ERROR_MESSAGE)
    .max(MOVIE.TITLE.MAX_LENGTH.VALUE, MOVIE.TITLE.MAX_LENGTH.ERROR_MESSAGE)
    .optional(),
  description: Zod.string({
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
  poster: Zod.object(
    {
      filename: Zod.string({
        invalid_type_error: MOVIE.POSTER.FILE_NAME.INVALID_TYPE_ERROR_MESSAGE,
        required_error: MOVIE.POSTER.FILE_NAME.REQUIRED_ERROR_MESSAGE,
      })
        .min(
          MOVIE.POSTER.FILE_NAME.MIN_LENGTH.VALUE,
          MOVIE.POSTER.FILE_NAME.MIN_LENGTH.ERROR_MESSAGE,
        )
        .max(
          MOVIE.POSTER.FILE_NAME.MAX_LENGTH.VALUE,
          MOVIE.POSTER.FILE_NAME.MAX_LENGTH.ERROR_MESSAGE,
        ),
      path: Zod.string({
        invalid_type_error: MOVIE.POSTER.FILE_PATH.INVALID_TYPE_ERROR_MESSAGE,
        required_error: MOVIE.POSTER.FILE_PATH.REQUIRED_ERROR_MESSAGE,
      })
        .min(
          MOVIE.POSTER.FILE_PATH.MIN_LENGTH.VALUE,
          MOVIE.POSTER.FILE_PATH.MIN_LENGTH.ERROR_MESSAGE,
        )
        .max(
          MOVIE.POSTER.FILE_PATH.MAX_LENGTH.VALUE,
          MOVIE.POSTER.FILE_PATH.MAX_LENGTH.ERROR_MESSAGE,
        ),
      size: Zod.coerce
        .number({
          invalid_type_error: MOVIE.POSTER.FILE_SIZE.INVALID_TYPE_ERROR_MESSAGE,
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
  ).optional(),
  price: Zod.coerce
    .number({
      invalid_type_error: MOVIE.PRICE.INVALID_TYPE_ERROR_MESSAGE,
      required_error: MOVIE.PRICE.REQUIRED_ERROR_MESSAGE,
    })
    .min(MOVIE.PRICE.MIN_VALUE.VALUE, MOVIE.PRICE.MIN_VALUE.ERROR_MESSAGE)
    .max(MOVIE.PRICE.MAX_VALUE.VALUE, MOVIE.PRICE.MAX_VALUE.ERROR_MESSAGE)
    .optional(),
  genreId: Zod.string({
    invalid_type_error: GENRE.ID.INVALID_TYPE_ERROR_MESSAGE,
    required_error: GENRE.ID.REQUIRED_ERROR_MESSAGE,
  })
    .uuid(GENRE.ID.ERROR_MESSAGE)
    .optional(),
}).superRefine((movieUpdates, context) => {
  if (!Object.keys(movieUpdates).length) {
    context.addIssue({
      code: Zod.ZodIssueCode.custom,
      message: MOVIE.NO_FIELDS_TO_UPDATE_ERROR_MESSAGE,
      fatal: true,
    });
  }
});

const updateMovieParamsSchema = Zod.object(
  {
    movieId: Zod.string({
      invalid_type_error: MOVIE.ID.INVALID_TYPE_ERROR_MESSAGE,
      required_error: MOVIE.ID.REQUIRED_ERROR_MESSAGE,
    }).uuid(MOVIE.ID.ERROR_MESSAGE),
  },
  {
    invalid_type_error: PARAMS.INVALID_TYPE_ERROR_MESSAGE,
    required_error: PARAMS.REQUIRED_ERROR_MESSAGE,
  },
);

const deleteMovieSchema = Zod.object(
  {
    movieId: Zod.string({
      invalid_type_error: MOVIE.ID.INVALID_TYPE_ERROR_MESSAGE,
      required_error: MOVIE.ID.REQUIRED_ERROR_MESSAGE,
    }).uuid(MOVIE.ID.ERROR_MESSAGE),
  },
  {
    invalid_type_error: PARAMS.INVALID_TYPE_ERROR_MESSAGE,
    required_error: PARAMS.REQUIRED_ERROR_MESSAGE,
  },
);

/**********************************************************************************/

function validateGetMovies(req: Request) {
  const { query } = req;

  const validatedResult = getMoviesSchema.safeParse(query);
  const parsedValidatedResult = parseValidationResult(
    validatedResult,
    HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
  );

  return parsedValidatedResult;
}

function validateGetMovie(req: Request) {
  const { params } = req;

  const validatedResult = getMovieSchema.safeParse(params);
  const { movieId } = parseValidationResult(
    validatedResult,
    HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
  );

  return movieId;
}

function validateCreateMovie(req: Request) {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const { body } = req;

  const validatedResult = createMovieSchema.safeParse(body);
  const parsedValidatedResult = parseValidationResult(
    validatedResult,
    HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
  );

  return parsedValidatedResult;
}

function validateUpdateMovie(req: Request) {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const { body, params } = req;

  const validatedBodyResult = updateMovieBodySchema.safeParse(body);
  const movieToUpdate = parseValidationResult(
    validatedBodyResult,
    HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
  );

  const validatedParamsResult = updateMovieParamsSchema.safeParse(params);
  const { movieId } = parseValidationResult(
    validatedParamsResult,
    HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
  );

  return {
    ...movieToUpdate,
    movieId,
  } as const;
}

function validateDeleteMovie(req: Request) {
  const { params } = req;

  const validatedResult = deleteMovieSchema.safeParse(params);
  const { movieId } = parseValidationResult(
    validatedResult,
    HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
  );

  return movieId;
}

/**********************************************************************************/

export {
  validateCreateMovie,
  validateDeleteMovie,
  validateGetMovie,
  validateGetMovies,
  validateUpdateMovie,
};
