import type { Request } from 'express';
import { ZodIssueCode, object as ZodObject, string as ZodString } from 'zod';

import { parseValidationResult, VALIDATION } from '../utils.validator.js';

/**********************************************************************************/

const { GENRE, PARAMS, BODY } = VALIDATION;

/**********************************************************************************/

const createGenreSchema = ZodObject(
  {
    id: ZodString({
      invalid_type_error: GENRE.ID.INVALID_TYPE_ERROR_MESSAGE,
    })
      .uuid(GENRE.ID.ERROR_MESSAGE)
      .optional(),
    name: ZodString({
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
);

const updateGenreBodySchema = ZodObject(
  {
    name: ZodString({
      invalid_type_error: GENRE.NAME.INVALID_TYPE_ERROR_MESSAGE,
    })
      .min(GENRE.NAME.MIN_LENGTH.VALUE, GENRE.NAME.MIN_LENGTH.ERROR_MESSAGE)
      .max(GENRE.NAME.MAX_LENGTH.VALUE, GENRE.NAME.MAX_LENGTH.ERROR_MESSAGE)
      .toLowerCase()
      .optional(),
  },
  {
    invalid_type_error: BODY.INVALID_TYPE_ERROR_MESSAGE,
    required_error: BODY.REQUIRED_ERROR_MESSAGE,
  },
).superRefine((genreUpdates, context) => {
  if (!Object.keys(genreUpdates).length) {
    context.addIssue({
      code: ZodIssueCode.custom,
      message: GENRE.NO_FIELDS_TO_UPDATE_ERROR_MESSAGE,
      fatal: true,
    });
  }
});

const updateGenreParamsSchema = ZodObject(
  {
    genre_id: ZodString({
      invalid_type_error: GENRE.ID.INVALID_TYPE_ERROR_MESSAGE,
      required_error: GENRE.ID.REQUIRED_ERROR_MESSAGE,
    }).uuid(GENRE.ID.ERROR_MESSAGE),
  },
  {
    invalid_type_error: PARAMS.INVALID_TYPE_ERROR_MESSAGE,
    required_error: PARAMS.REQUIRED_ERROR_MESSAGE,
  },
);

const deleteGenreSchema = ZodObject(
  {
    genre_id: ZodString({
      invalid_type_error: GENRE.ID.INVALID_TYPE_ERROR_MESSAGE,
      required_error: GENRE.ID.REQUIRED_ERROR_MESSAGE,
    }).uuid(GENRE.ID.ERROR_MESSAGE),
  },
  {
    invalid_type_error: PARAMS.INVALID_TYPE_ERROR_MESSAGE,
    required_error: PARAMS.REQUIRED_ERROR_MESSAGE,
  },
);

/**********************************************************************************/

function validateCreateGenre(req: Request) {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const { body } = req;

  const validatedResult = createGenreSchema.safeParse(body);
  const parsedValidatedResult = parseValidationResult(validatedResult);

  return parsedValidatedResult;
}

function validateUpdateGenre(req: Request) {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const { body, params } = req;

  const validatedBodyResult = updateGenreBodySchema.safeParse(body);
  const { name } = parseValidationResult(validatedBodyResult);

  const validatedParamsResult = updateGenreParamsSchema.safeParse(params);
  const { genre_id: genreId } = parseValidationResult(validatedParamsResult);

  return {
    genreId,
    name,
  } as const;
}

function validateDeleteGenre(req: Request) {
  const { params } = req;

  const validatedResult = deleteGenreSchema.safeParse(params);
  const { genre_id: genreId } = parseValidationResult(validatedResult);

  return genreId;
}

/**********************************************************************************/

export { validateCreateGenre, validateDeleteGenre, validateUpdateGenre };
