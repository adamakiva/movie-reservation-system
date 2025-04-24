import type { Request } from 'express';
import zod, { ZodIssueCode } from 'zod';

import { parseValidationResult, VALIDATION } from '../utils.ts';

/**********************************************************************************/

const { BODY, PARAMS } = VALIDATION;

const GENRE = {
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
} as const;

const GENRE_SCHEMAS = {
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
} as const;

/**********************************************************************************/

function validateCreateGenre(request: Request) {
  const validatedResult = parseValidationResult(
    GENRE_SCHEMAS.CREATE.safeParse(request.body),
  );

  return validatedResult;
}

function validateUpdateGenre(request: Request) {
  const { name } = parseValidationResult(
    GENRE_SCHEMAS.UPDATE.BODY.safeParse(request.body),
  );
  const { genre_id: genreId } = parseValidationResult(
    GENRE_SCHEMAS.UPDATE.PARAMS.safeParse(request.params),
  );

  return {
    genreId,
    name,
  } as const;
}

function validateDeleteGenre(request: Request) {
  const { genre_id: genreId } = parseValidationResult(
    GENRE_SCHEMAS.DELETE.safeParse(request.params),
  );

  return genreId;
}

/**********************************************************************************/

export { GENRE, validateCreateGenre, validateDeleteGenre, validateUpdateGenre };
