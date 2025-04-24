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

const { PAGINATION, QUERY, PARAMS } = VALIDATION;

const GENRE = {
  ID: {
    INVALID_TYPE_ERROR_MESSAGE: 'Genre id must be a string',
    REQUIRED_ERROR_MESSAGE: 'Genre id is required',
    ERROR_MESSAGE: 'Genre id must be a valid UUIDV4',
  },
} as const;

const MOVIE = {
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
} as const;

const MOVIE_SCHEMAS = {
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
      .max(MOVIE.TITLE.MAX_LENGTH.VALUE, MOVIE.TITLE.MAX_LENGTH.ERROR_MESSAGE),
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
        .max(MOVIE.PRICE.MAX_VALUE.VALUE, MOVIE.PRICE.MAX_VALUE.ERROR_MESSAGE),
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
} as const;

const MOVIE_POSTER_SCHEMAS = {
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
} as const;

/**********************************************************************************/

function validateGetMovies(request: Request) {
  const validatedResult = parseValidationResult(
    MOVIE_SCHEMAS.READ.MANY.safeParse(request.query),
  );

  return validatedResult;
}

function validateGetMovie(request: Request) {
  const { movie_id: movieId } = parseValidationResult(
    MOVIE_SCHEMAS.READ.SINGLE.safeParse(request.params),
  );

  return movieId;
}

function validateGetMoviePoster(request: Request) {
  const { movie_id: movieId } = parseValidationResult(
    MOVIE_POSTER_SCHEMAS.READ.safeParse(request.params),
  );

  return movieId;
}

function validateCreateMovie(request: Request) {
  const validatedResult = parseValidationResult(
    MOVIE_SCHEMAS.CREATE.safeParse({
      ...request.body,
      poster: request.file,
    }),
  );

  return validatedResult;
}

function validateUpdateMovie(request: Request) {
  const movieToUpdate = parseValidationResult(
    MOVIE_SCHEMAS.UPDATE.BODY.safeParse(
      request.file ? { ...request.body, poster: request.file } : request.body,
    ),
  );
  const { movie_id: movieId } = parseValidationResult(
    MOVIE_SCHEMAS.UPDATE.PARAMS.safeParse(request.params),
  );

  return {
    ...movieToUpdate,
    movieId,
  } as const;
}

function validateDeleteMovie(request: Request) {
  const { movie_id: movieId } = parseValidationResult(
    MOVIE_SCHEMAS.DELETE.safeParse(request.params),
  );

  return movieId;
}

/**********************************************************************************/

export {
  MOVIE,
  validateCreateMovie,
  validateDeleteMovie,
  validateGetMovie,
  validateGetMoviePoster,
  validateGetMovies,
  validateUpdateMovie,
};
