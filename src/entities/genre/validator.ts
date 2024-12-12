import { type Request, HTTP_STATUS_CODES } from '../../utils/index.js';

import {
  createGenreSchema,
  deleteGenreSchema,
  parseValidationResult,
  updateGenreBodySchema,
  updateGenreParamsSchema,
} from '../utils.validator.js';

/**********************************************************************************/

function validateCreateGenre(req: Request) {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const { body } = req;

  const validatedResult = createGenreSchema.safeParse(body);
  const parsedValidatedResult = parseValidationResult(
    validatedResult,
    HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
  );

  return parsedValidatedResult;
}

function validateUpdateGenre(req: Request) {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const { body, params } = req;

  const validatedBodyResult = updateGenreBodySchema.safeParse(body);
  const { name } = parseValidationResult(
    validatedBodyResult,
    HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
  );

  const validatedParamsResult = updateGenreParamsSchema.safeParse(params);
  const { genreId } = parseValidationResult(
    validatedParamsResult,
    HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
  );

  return {
    genreId,
    name,
  } as const;
}

function validateDeleteGenre(req: Request) {
  const { params } = req;

  const validatedResult = deleteGenreSchema.safeParse(params);
  const { genreId } = parseValidationResult(
    validatedResult,
    HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
  );

  return genreId;
}

/**********************************************************************************/

export { validateCreateGenre, validateDeleteGenre, validateUpdateGenre };
