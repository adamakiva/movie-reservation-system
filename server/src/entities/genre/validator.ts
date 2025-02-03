import type { Request } from 'express';

import { parseValidationResult, SCHEMAS } from '../utils.validator.ts';

/**********************************************************************************/

const { GENRE } = SCHEMAS;

/**********************************************************************************/

function validateCreateGenre(req: Request) {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const { body } = req;

  const validatedResult = GENRE.CREATE.safeParse(body);
  const parsedValidatedResult = parseValidationResult(validatedResult);

  return parsedValidatedResult;
}

function validateUpdateGenre(req: Request) {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const { body, params } = req;

  const validatedBodyResult = GENRE.UPDATE.BODY.safeParse(body);
  const { name } = parseValidationResult(validatedBodyResult);

  const validatedParamsResult = GENRE.UPDATE.PARAMS.safeParse(params);
  const { genre_id: genreId } = parseValidationResult(validatedParamsResult);

  return {
    genreId,
    name,
  } as const;
}

function validateDeleteGenre(req: Request) {
  const { params } = req;

  const validatedResult = GENRE.DELETE.safeParse(params);
  const { genre_id: genreId } = parseValidationResult(validatedResult);

  return genreId;
}

/**********************************************************************************/

export { validateCreateGenre, validateDeleteGenre, validateUpdateGenre };
