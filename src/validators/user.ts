import { type Request, HTTP_STATUS_CODES } from '../utils/index.js';

import {
  createUserSchema,
  deleteUserSchema,
  getUserSchema,
  getUsersSchema,
  parseValidationResult,
  updateUserBodySchema,
  updateUserParamsSchema,
} from './utils.js';

/**********************************************************************************/

function validateGetUsers(req: Request) {
  const { query } = req;

  return parseValidationResult(
    getUsersSchema.safeParse(query),
    HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
  );
}

function validateGetUser(req: Request) {
  const { params } = req;

  return parseValidationResult(
    getUserSchema.safeParse(params),
    HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
  ).userId;
}

function validateCreateUser(req: Request) {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const { body } = req;

  return parseValidationResult(
    createUserSchema.safeParse(body),
    HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
  );
}

function validateUpdateUser(req: Request) {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const { body, params } = req;

  const userToUpdate = parseValidationResult(
    updateUserBodySchema.safeParse(body),
    HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
  );
  const { userId } = parseValidationResult(
    updateUserParamsSchema.safeParse(params),
    HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
  );

  return {
    ...userToUpdate,
    userId,
  } as const;
}

function validateDeleteUser(req: Request) {
  const { params } = req;

  return parseValidationResult(
    deleteUserSchema.safeParse(params),
    HTTP_STATUS_CODES.UNPROCESSABLE_ENTITY,
  ).userId;
}

/**********************************************************************************/

export {
  validateCreateUser,
  validateDeleteUser,
  validateGetUser,
  validateGetUsers,
  validateUpdateUser,
};
