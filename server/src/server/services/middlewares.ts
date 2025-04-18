import {
  ERROR_CODES,
  HTTP_STATUS_CODES,
} from '@adamakiva/movie-reservation-system-shared';
import type { NextFunction, Request, Response } from 'express';
import pg from 'postgres';

import { GeneralError } from '../../utils/errors.ts';
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
        .set('Allow', Array.from(allowedMethods).join(', '))
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
  if (
    error instanceof Object &&
    'type' in error &&
    error.type === 'entity.too.large'
  ) {
    response
      .status(HTTP_STATUS_CODES.CONTENT_TOO_LARGE)
      .json('Request entity too large');
    return;
  }
  if (error instanceof pg.PostgresError) {
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
      logger.fatal(
        'Should have been handled by the code and never get here. Check the' +
          ' code implementation:\n',
        error,
      );
      break;
    case TOO_MANY_CONNECTIONS:
      logger.fatal(
        'Exceeded database maximum connections.\nThis Should never happen,' +
          ' check the server and database logs to understand why it happened:\n',
        error,
      );
      break;
    default:
      logger.fatal('Unexpected database error:\n', error);
      break;
  }

  response
    .status(HTTP_STATUS_CODES.SERVER_ERROR)
    .json('Unexpected error, please try again');
}

function handleUnexpectedError(error: unknown, response: ResponseWithContext) {
  const { logger } = response.locals.context;

  if (error instanceof Error) {
    logger.fatal('Unhandled exception:\n', error);
  } else {
    logger.fatal('Caught a non-error object.\nThis should never happen', error);
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
};
