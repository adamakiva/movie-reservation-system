import type { Request } from 'express';

import { parseValidationResult, SCHEMAS } from '../utils.validator.ts';

/**********************************************************************************/

const { USER } = SCHEMAS;

/**********************************************************************************/

function validateGetUsers(req: Request) {
  const { query } = req;

  const validatedResult = USER.READ.MANY.safeParse(query);
  const parsedValidatedResult = parseValidationResult(validatedResult);

  return parsedValidatedResult;
}

function validateGetUser(req: Request) {
  const { params } = req;

  const validatedResult = USER.READ.SINGLE.safeParse(params);
  const { user_id: userId } = parseValidationResult(validatedResult);

  return userId;
}

function validateCreateUser(req: Request) {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const { body } = req;

  const validatedResult = USER.CREATE.safeParse(body);
  const parsedValidatedResult = parseValidationResult(validatedResult);

  return parsedValidatedResult;
}

function validateUpdateUser(req: Request) {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const { body, params } = req;

  const validatedBodyResult = USER.UPDATE.BODY.safeParse(body);
  const userToUpdate = parseValidationResult(validatedBodyResult);

  const validatedParamsResult = USER.UPDATE.PARAMS.safeParse(params);
  const { user_id: userId } = parseValidationResult(validatedParamsResult);

  return {
    ...userToUpdate,
    userId,
  } as const;
}

function validateDeleteUser(req: Request) {
  const { params } = req;

  const validatedResult = USER.DELETE.safeParse(params);
  const { user_id: userId } = parseValidationResult(validatedResult);

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
