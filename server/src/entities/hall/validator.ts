import type { Request } from 'express';

import { parseValidationResult, SCHEMAS } from '../utils.validator.ts';

/**********************************************************************************/

const { HALL } = SCHEMAS;

/**********************************************************************************/

function validateCreateHall(req: Request) {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const { body } = req;

  const validatedResult = HALL.CREATE.safeParse(body);
  const parsedValidatedResult = parseValidationResult(validatedResult);

  return parsedValidatedResult;
}

function validateUpdateHall(req: Request) {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const { body, params } = req;

  const validatedBodyResult = HALL.UPDATE.BODY.safeParse(body);
  const parsedValidatedResult = parseValidationResult(validatedBodyResult);

  const validatedParamsResult = HALL.UPDATE.PARAMS.safeParse(params);
  const { hall_id: hallId } = parseValidationResult(validatedParamsResult);

  return {
    hallId,
    ...parsedValidatedResult,
  } as const;
}

function validateDeleteHall(req: Request) {
  const { params } = req;

  const validatedResult = HALL.DELETE.safeParse(params);
  const { hall_id: hallId } = parseValidationResult(validatedResult);

  return hallId;
}

/**********************************************************************************/

export { validateCreateHall, validateDeleteHall, validateUpdateHall };
