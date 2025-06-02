import {
  ERROR_CODES,
  HTTP_STATUS_CODES,
} from '@adamakiva/movie-reservation-system-shared';
import { eq, or } from 'drizzle-orm';
import type { NextFunction, Request, Response } from 'express';
import type pg from 'postgres';

import { isDatabaseError } from '../../database/index.ts';
import { GeneralError, isError } from '../../utils/errors.ts';
import type { Logger } from '../../utils/logger.ts';

/**********************************************************************************/

function checkMethod(allowedMethods: readonly string[]) {
  return (request: Request, response: Response, next: NextFunction) => {
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

function handleNonExistentRoute(request: Request, response: Response) {
  response
    .status(HTTP_STATUS_CODES.NOT_FOUND)
    .json(`The route '${request.url}' does not exist`);
}

function isAdmin(adminRoleId: string) {
  return async (request: Request, _response: Response, next: NextFunction) => {
    const { authentication, database } = request.app.locals;

    const handler = database.getHandler();
    const { user: userModel } = database.getModels();
    const userId = authentication.getUserId(request.headers.authorization!);

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
  return async (request: Request, _response: Response, next: NextFunction) => {
    const { authentication, database } = request.app.locals;

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
  request: Request,
  response: Response,
  next: NextFunction,
) {
  if (response.headersSent) {
    next(error);
    return;
  }

  const { logger } = request.app.locals;

  if (error instanceof GeneralError) {
    const { code, message } = error.getClientError(response);

    logger.warn(error);
    response.status(code).json(message);
    return;
  }
  if (isError(error) && isDatabaseError(error.cause)) {
    handlePostgresError({ response, logger, error: error.cause });
    return;
  }
  if (isError(error) && 'type' in error && error.type === 'entity.too.large') {
    response
      .status(HTTP_STATUS_CODES.CONTENT_TOO_LARGE)
      .json('Request entity too large');
    return;
  }

  handleUnexpectedError({ response, logger, error });
}

function handlePostgresError(params: {
  response: Response;
  logger: Logger;
  error: pg.PostgresError;
}) {
  const { response, logger, error } = params;
  const { FOREIGN_KEY_VIOLATION, UNIQUE_VIOLATION, TOO_MANY_CONNECTIONS } =
    ERROR_CODES.POSTGRES;

  switch (error.code) {
    case FOREIGN_KEY_VIOLATION:
    case UNIQUE_VIOLATION: {
      logger.error(
        'Should have been handled by the code and never get here. Check the' +
          ' code implementation:\n',
        error,
      );
      break;
    }
    case TOO_MANY_CONNECTIONS: {
      logger.error(
        'Exceeded database maximum connections.\nThis Should never happen,' +
          ' check the server and database logs to understand why it happened:\n',
        error,
      );
      break;
    }
    default: {
      logger.error('Unexpected database error:\n', error);
      break;
    }
  }

  response
    .status(HTTP_STATUS_CODES.SERVER_ERROR)
    .json('Unexpected error, please try again');
}

function handleUnexpectedError(params: {
  response: Response;
  logger: Logger;
  error: unknown;
}) {
  const { response, logger, error } = params;

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
  checkMethod,
  errorHandler,
  handleNonExistentRoute,
  isAdmin,
  isSameUserOrAdmin,
};
