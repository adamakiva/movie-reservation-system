import type { Request } from 'express';
import zod, { ZodIssueCode } from 'zod';

import { coerceNumber, parseValidationResult, VALIDATION } from '../utils.ts';

/**********************************************************************************/

const { BODY, PARAMS } = VALIDATION;

const HALL = {
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
} as const;

const HALL_SCHEMAS = {
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
          .max(HALL.ROWS.MAX_LENGTH.VALUE, HALL.ROWS.MAX_LENGTH.ERROR_MESSAGE),
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
            .min(HALL.NAME.MIN_LENGTH.VALUE, HALL.NAME.MIN_LENGTH.ERROR_MESSAGE)
            .max(HALL.NAME.MAX_LENGTH.VALUE, HALL.NAME.MAX_LENGTH.ERROR_MESSAGE)
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
} as const;

/**********************************************************************************/

function validateCreateHall(request: Request) {
  const validatedResult = parseValidationResult(
    HALL_SCHEMAS.CREATE.safeParse(request.body),
  );

  return validatedResult;
}

function validateUpdateHall(request: Request) {
  const validatedResult = parseValidationResult(
    HALL_SCHEMAS.UPDATE.BODY.safeParse(request.body),
  );
  const { hall_id: hallId } = parseValidationResult(
    HALL_SCHEMAS.UPDATE.PARAMS.safeParse(request.params),
  );

  return {
    hallId,
    ...validatedResult,
  } as const;
}

function validateDeleteHall(request: Request) {
  const { hall_id: hallId } = parseValidationResult(
    HALL_SCHEMAS.DELETE.safeParse(request.params),
  );

  return hallId;
}

/**********************************************************************************/

export { HALL, validateCreateHall, validateDeleteHall, validateUpdateHall };
