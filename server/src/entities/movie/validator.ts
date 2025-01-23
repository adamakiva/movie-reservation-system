import type { Request } from 'express';
import {
  ZodIssueCode,
  NEVER as ZodNever,
  number as ZodNumber,
  object as ZodObject,
  preprocess as ZodPreprocessor,
  string as ZodString,
} from 'zod';

import { decodeCursor, HTTP_STATUS_CODES } from '../../utils/index.js';

import {
  coerceNumber,
  cursorSchema,
  parseValidationResult,
  VALIDATION,
} from '../utils.validator.js';

/**********************************************************************************/

const { GENRE, MOVIE, PAGINATION, PARAMS, QUERY } = VALIDATION;

/**********************************************************************************/

const getMoviesSchema = ZodObject(
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
    const { id: movieId, createdAt } = cursorSchema.parse(
      decodeCursor(val.cursor),
    );

    return {
      cursor: { movieId, createdAt },
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

const getMovieSchema = ZodObject(
  {
    movie_id: ZodString({
      invalid_type_error: MOVIE.ID.INVALID_TYPE_ERROR_MESSAGE,
      required_error: MOVIE.ID.REQUIRED_ERROR_MESSAGE,
    }).uuid(MOVIE.ID.ERROR_MESSAGE),
  },
  {
    invalid_type_error: PARAMS.INVALID_TYPE_ERROR_MESSAGE,
    required_error: PARAMS.REQUIRED_ERROR_MESSAGE,
  },
);

const getMoviePosterSchema = ZodObject(
  {
    movie_id: ZodString({
      invalid_type_error: MOVIE.ID.INVALID_TYPE_ERROR_MESSAGE,
      required_error: MOVIE.ID.REQUIRED_ERROR_MESSAGE,
    }).uuid(MOVIE.ID.ERROR_MESSAGE),
  },
  {
    invalid_type_error: PARAMS.INVALID_TYPE_ERROR_MESSAGE,
    required_error: PARAMS.REQUIRED_ERROR_MESSAGE,
  },
);

const createMovieSchema = ZodObject({
  title: ZodString({
    invalid_type_error: MOVIE.TITLE.INVALID_TYPE_ERROR_MESSAGE,
    required_error: MOVIE.TITLE.REQUIRED_ERROR_MESSAGE,
  })
    .min(MOVIE.TITLE.MIN_LENGTH.VALUE, MOVIE.TITLE.MIN_LENGTH.ERROR_MESSAGE)
    .max(MOVIE.TITLE.MAX_LENGTH.VALUE, MOVIE.TITLE.MAX_LENGTH.ERROR_MESSAGE),
  description: ZodString({
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
  poster: ZodObject(
    {
      path: ZodString({
        invalid_type_error:
          MOVIE.POSTER.ABSOLUTE_FILE_PATH.INVALID_TYPE_ERROR_MESSAGE,
        required_error: MOVIE.POSTER.ABSOLUTE_FILE_PATH.REQUIRED_ERROR_MESSAGE,
      })
        .min(
          MOVIE.POSTER.ABSOLUTE_FILE_PATH.MIN_LENGTH.VALUE,
          MOVIE.POSTER.ABSOLUTE_FILE_PATH.MIN_LENGTH.ERROR_MESSAGE,
        )
        .max(
          MOVIE.POSTER.ABSOLUTE_FILE_PATH.MAX_LENGTH.VALUE,
          MOVIE.POSTER.ABSOLUTE_FILE_PATH.MAX_LENGTH.ERROR_MESSAGE,
        ),
      mimeType: ZodString({
        invalid_type_error: MOVIE.POSTER.MIME_TYPE.INVALID_TYPE_ERROR_MESSAGE,
        required_error: MOVIE.POSTER.MIME_TYPE.REQUIRED_ERROR_MESSAGE,
      }).nonempty(MOVIE.POSTER.MIME_TYPE.REQUIRED_ERROR_MESSAGE),
      size: ZodNumber({
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
  ).transform((val) => {
    const { path, size, ...fields } = val;

    return {
      ...fields,
      absolutePath: path,
      sizeInBytes: size,
    };
  }),
  price: ZodPreprocessor(
    coerceNumber(
      MOVIE.PRICE.INVALID_TYPE_ERROR_MESSAGE,
      MOVIE.PRICE.REQUIRED_ERROR_MESSAGE,
    ),
    ZodNumber()
      .min(MOVIE.PRICE.MIN_VALUE.VALUE, MOVIE.PRICE.MIN_VALUE.ERROR_MESSAGE)
      .max(MOVIE.PRICE.MAX_VALUE.VALUE, MOVIE.PRICE.MAX_VALUE.ERROR_MESSAGE),
  ),
  genreId: ZodString({
    invalid_type_error: GENRE.ID.INVALID_TYPE_ERROR_MESSAGE,
    required_error: GENRE.ID.REQUIRED_ERROR_MESSAGE,
  }).uuid(GENRE.ID.ERROR_MESSAGE),
});

const updateMovieBodySchema = ZodObject({
  title: ZodString({
    invalid_type_error: MOVIE.TITLE.INVALID_TYPE_ERROR_MESSAGE,
    required_error: MOVIE.TITLE.REQUIRED_ERROR_MESSAGE,
  })
    .min(MOVIE.TITLE.MIN_LENGTH.VALUE, MOVIE.TITLE.MIN_LENGTH.ERROR_MESSAGE)
    .max(MOVIE.TITLE.MAX_LENGTH.VALUE, MOVIE.TITLE.MAX_LENGTH.ERROR_MESSAGE)
    .optional(),
  description: ZodString({
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
  poster: ZodObject(
    {
      path: ZodString({
        invalid_type_error:
          MOVIE.POSTER.ABSOLUTE_FILE_PATH.INVALID_TYPE_ERROR_MESSAGE,
        required_error: MOVIE.POSTER.ABSOLUTE_FILE_PATH.REQUIRED_ERROR_MESSAGE,
      })
        .min(
          MOVIE.POSTER.ABSOLUTE_FILE_PATH.MIN_LENGTH.VALUE,
          MOVIE.POSTER.ABSOLUTE_FILE_PATH.MIN_LENGTH.ERROR_MESSAGE,
        )
        .max(
          MOVIE.POSTER.ABSOLUTE_FILE_PATH.MAX_LENGTH.VALUE,
          MOVIE.POSTER.ABSOLUTE_FILE_PATH.MAX_LENGTH.ERROR_MESSAGE,
        ),
      mimeType: ZodString({
        invalid_type_error: MOVIE.POSTER.MIME_TYPE.INVALID_TYPE_ERROR_MESSAGE,
        required_error: MOVIE.POSTER.MIME_TYPE.REQUIRED_ERROR_MESSAGE,
      }).nonempty(MOVIE.POSTER.MIME_TYPE.REQUIRED_ERROR_MESSAGE),
      size: ZodNumber({
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
  price: ZodPreprocessor(
    coerceNumber(MOVIE.PRICE.INVALID_TYPE_ERROR_MESSAGE),
    ZodNumber()
      .min(MOVIE.PRICE.MIN_VALUE.VALUE, MOVIE.PRICE.MIN_VALUE.ERROR_MESSAGE)
      .max(MOVIE.PRICE.MAX_VALUE.VALUE, MOVIE.PRICE.MAX_VALUE.ERROR_MESSAGE),
  ).optional(),
  genreId: ZodString({
    invalid_type_error: GENRE.ID.INVALID_TYPE_ERROR_MESSAGE,
    required_error: GENRE.ID.REQUIRED_ERROR_MESSAGE,
  })
    .uuid(GENRE.ID.ERROR_MESSAGE)
    .optional(),
}).superRefine((movieUpdates, context) => {
  if (!Object.keys(movieUpdates).length) {
    context.addIssue({
      code: ZodIssueCode.custom,
      message: MOVIE.NO_FIELDS_TO_UPDATE_ERROR_MESSAGE,
      fatal: true,
    });
  }
});

const updateMovieParamsSchema = ZodObject(
  {
    movie_id: ZodString({
      invalid_type_error: MOVIE.ID.INVALID_TYPE_ERROR_MESSAGE,
      required_error: MOVIE.ID.REQUIRED_ERROR_MESSAGE,
    }).uuid(MOVIE.ID.ERROR_MESSAGE),
  },
  {
    invalid_type_error: PARAMS.INVALID_TYPE_ERROR_MESSAGE,
    required_error: PARAMS.REQUIRED_ERROR_MESSAGE,
  },
);

const deleteMovieSchema = ZodObject(
  {
    movie_id: ZodString({
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
  const { movie_id: movieId } = parseValidationResult(
    validatedResult,
    HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
  );

  return movieId;
}

function validateGetMoviePoster(req: Request) {
  const { params } = req;

  const validatedResult = getMoviePosterSchema.safeParse(params);
  const { movie_id: movieId } = parseValidationResult(
    validatedResult,
    HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
  );

  return movieId;
}

function validateCreateMovie(req: Request) {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const { body, file } = req;

  const validatedResult = createMovieSchema.safeParse({
    ...body,
    poster: file,
  });
  const parsedValidatedResult = parseValidationResult(
    validatedResult,
    HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
  );

  return parsedValidatedResult;
}

function validateUpdateMovie(req: Request) {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const { body, params, file } = req;

  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const updates = file ? { ...body, poster: file } : body;

  const validatedBodyResult = updateMovieBodySchema.safeParse(updates);
  const movieToUpdate = parseValidationResult(
    validatedBodyResult,
    HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
  );

  const validatedParamsResult = updateMovieParamsSchema.safeParse(params);
  const { movie_id: movieId } = parseValidationResult(
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
  const { movie_id: movieId } = parseValidationResult(
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
  validateGetMoviePoster,
  validateGetMovies,
  validateUpdateMovie,
};
