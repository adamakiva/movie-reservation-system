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

  return parseValidationResult(
    createGenreSchema.safeParse(body),
    HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
  );
}

function validateUpdateGenre(req: Request) {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const { body, params } = req;

  const { name } = parseValidationResult(
    updateGenreBodySchema.safeParse(body),
    HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
  );
  const { genreId } = parseValidationResult(
    updateGenreParamsSchema.safeParse(params),
    HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
  );

  return {
    genreId,
    name,
  } as const;
}

function validateDeleteGenre(req: Request) {
  const { params } = req;

  return parseValidationResult(
    deleteGenreSchema.safeParse(params),
    HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
  ).genreId;
}

/**********************************************************************************/

export { validateCreateGenre, validateDeleteGenre, validateUpdateGenre };
