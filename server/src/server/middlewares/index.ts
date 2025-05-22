import {
  ERROR_CODES,
  HTTP_STATUS_CODES,
} from '@adamakiva/movie-reservation-system-shared';
import { eq, or } from 'drizzle-orm';
import type { NextFunction, Request, Response } from 'express';
import type pg from 'postgres';

import { isDatabaseError } from '../../database/index.ts';
import { GeneralError, isError } from '../../utils/errors.ts';
import type {
  RequestContext,
  ResponseWithContext,
  ResponseWithoutContext,
} from '../../utils/types.ts';

/**********************************************************************************/

function checkMethod(allowedMethods: readonly string[]) {
  return (
    request: Request,
    response: ResponseWithoutContext,
    next: NextFunction,
  ) => {
    if (!allowedMethods.includes(request.method.toUpperCase())) {
      // Reason for explicitly adding the header:
      // https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Allow
      response
        .set('Allow', allowedMethods.join(', '))
        .status(HTTP_STATUS_CODES.NOT_ALLOWED)
        .end();
      return;
    }

    next();
  };
}

function attachRequestContext(context: RequestContext) {
  return (_req: Request, response: Response, next: NextFunction) => {
    response.locals.context = context;

    next();
  };
}

function handleNonExistentRoute(
  request: Request,
  response: ResponseWithoutContext,
) {
  response
    .status(HTTP_STATUS_CODES.NOT_FOUND)
    .json(`The route '${request.url}' does not exist`);
}

function isAdmin(adminRoleId: string) {
  return async (
    request: Request,
    response: ResponseWithContext,
    next: NextFunction,
  ) => {
    const { authentication, database } = response.locals.context;
    const userId = authentication.getUserId(request.headers.authorization!);

    const handler = database.getHandler();
    const { user: userModel } = database.getModels();

    const [user] = await handler
      .select({ roleId: userModel.roleId })
      .from(userModel)
      .where(eq(userModel.id, userId));
    if (!user || user.roleId !== adminRoleId) {
      throw new GeneralError(HTTP_STATUS_CODES.FORBIDDEN, 'Forbidden');
    }

    next();
  };
}

function isSameUserOrAdmin(adminRoleId: string) {
  return async (
    request: Request,
    response: ResponseWithContext,
    next: NextFunction,
  ) => {
    const { authentication, database } = response.locals.context;

    const handler = database.getHandler();
    const { user: userModel } = database.getModels();
    const userId = authentication.getUserId(request.headers.authorization!);

    const userIds = (
      await handler
        .select({ id: userModel.id })
        .from(userModel)
        .where(or(eq(userModel.id, userId), eq(userModel.roleId, adminRoleId)))
    ).map(({ id }) => {
      return id;
    });
    if (!userIds.includes(userId)) {
      throw new GeneralError(HTTP_STATUS_CODES.FORBIDDEN, 'Forbidden');
    }

    next();
  };
}

function errorHandler(
  error: unknown,
  _: Request,
  response: ResponseWithContext,
  next: NextFunction,
) {
  if (response.headersSent) {
    next(error);
    return;
  }

  if (error instanceof GeneralError) {
    const { code, message } = error.getClientError(response);

    response.locals.context.logger.warn(error);
    response.status(code).json(message);
    return;
  }
  if (isError(error) && 'type' in error && error.type === 'entity.too.large') {
    response
      .status(HTTP_STATUS_CODES.CONTENT_TOO_LARGE)
      .json('Request entity too large');
    return;
  }
  if (isError(error) && isDatabaseError(error)) {
    handlePostgresError(error, response);
    return;
  }

  handleUnexpectedError(error, response);
}

function handlePostgresError(
  error: pg.PostgresError,
  response: ResponseWithContext,
) {
  const { FOREIGN_KEY_VIOLATION, UNIQUE_VIOLATION, TOO_MANY_CONNECTIONS } =
    ERROR_CODES.POSTGRES;
  const { logger } = response.locals.context;

  switch (error.code) {
    case FOREIGN_KEY_VIOLATION:
    case UNIQUE_VIOLATION:
      logger.error(
        'Should have been handled by the code and never get here. Check the' +
          ' code implementation:\n',
        error,
      );
      break;
    case TOO_MANY_CONNECTIONS:
      logger.error(
        'Exceeded database maximum connections.\nThis Should never happen,' +
          ' check the server and database logs to understand why it happened:\n',
        error,
      );
      break;
    default:
      logger.error('Unexpected database error:\n', error);
      break;
  }

  response
    .status(HTTP_STATUS_CODES.SERVER_ERROR)
    .json('Unexpected error, please try again');
}

function handleUnexpectedError(error: unknown, response: ResponseWithContext) {
  const { logger } = response.locals.context;

  if (error instanceof Error) {
    logger.error('Unhandled exception:\n', error);
  } else {
    logger.error('Caught a non-error object.\nThis should never happen', error);
  }

  response
    .status(HTTP_STATUS_CODES.SERVER_ERROR)
    .json('Unexpected error, please try again');
}

/**********************************************************************************/

export {
  attachRequestContext,
  checkMethod,
  errorHandler,
  handleNonExistentRoute,
  isAdmin,
  isSameUserOrAdmin,
};
