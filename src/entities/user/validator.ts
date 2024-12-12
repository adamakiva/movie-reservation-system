import { type Request, HTTP_STATUS_CODES } from '../../utils/index.js';

import {
  createUserSchema,
  deleteUserSchema,
  getUserSchema,
  getUsersSchema,
  parseValidationResult,
  updateUserBodySchema,
  updateUserParamsSchema,
} from '../utils.validator.js';

/**********************************************************************************/

function validateGetUsers(req: Request) {
  const { query } = req;

  const validatedResult = getUsersSchema.safeParse(query);
  const parsedValidatedResult = parseValidationResult(
    validatedResult,
    HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
  );

  return parsedValidatedResult;
}

function validateGetUser(req: Request) {
  const { params } = req;

  const validatedResult = getUserSchema.safeParse(params);
  const { userId } = parseValidationResult(
    validatedResult,
    HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
  );

  return userId;
}

function validateCreateUser(req: Request) {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const { body } = req;

  const validatedResult = createUserSchema.safeParse(body);
  const parsedValidatedResult = parseValidationResult(
    validatedResult,
    HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
  );

  return parsedValidatedResult;
}

function validateUpdateUser(req: Request) {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const { body, params } = req;

  const validatedBodyResult = updateUserBodySchema.safeParse(body);
  const userToUpdate = parseValidationResult(
    validatedBodyResult,
    HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
  );

  const validatedParamsResult = updateUserParamsSchema.safeParse(params);
  const { userId } = parseValidationResult(
    validatedParamsResult,
    HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
  );

  return {
    ...userToUpdate,
    userId,
  } as const;
}

function validateDeleteUser(req: Request) {
  const { params } = req;

  const validatedResult = deleteUserSchema.safeParse(params);
  const { userId } = parseValidationResult(
    validatedResult,
    HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
  );

  return userId;
}

/**********************************************************************************/

export {
  validateCreateUser,
  validateDeleteUser,
  validateGetUser,
  validateGetUsers,
  validateUpdateUser,
};
