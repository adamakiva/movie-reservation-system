import type { Request } from 'express';
import zod, { ZodIssueCode } from 'zod';

import {
  coerceNumber,
  parseValidationResult,
  VALIDATION,
} from '../utils.validator.js';

/**********************************************************************************/

const { HALL, PARAMS, BODY } = VALIDATION;

/**********************************************************************************/

const createHallSchema = zod.object(
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
);

const updateHallBodySchema = zod
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
            .min(HALL.ROWS.MIN_LENGTH.VALUE, HALL.ROWS.MIN_LENGTH.ERROR_MESSAGE)
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
  });

const updateHallParamsSchema = zod.object(
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
);

const deleteHallSchema = zod.object(
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
);

/**********************************************************************************/

function validateCreateHall(req: Request) {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const { body } = req;

  const validatedResult = createHallSchema.safeParse(body);
  const parsedValidatedResult = parseValidationResult(validatedResult);

  return parsedValidatedResult;
}

function validateUpdateHall(req: Request) {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const { body, params } = req;

  const validatedBodyResult = updateHallBodySchema.safeParse(body);
  const parsedValidatedResult = parseValidationResult(validatedBodyResult);

  const validatedParamsResult = updateHallParamsSchema.safeParse(params);
  const { hall_id: hallId } = parseValidationResult(validatedParamsResult);

  return {
    hallId,
    ...parsedValidatedResult,
  } as const;
}

function validateDeleteHall(req: Request) {
  const { params } = req;

  const validatedResult = deleteHallSchema.safeParse(params);
  const { hall_id: hallId } = parseValidationResult(validatedResult);

  return hallId;
}

/**********************************************************************************/

export { validateCreateHall, validateDeleteHall, validateUpdateHall };
