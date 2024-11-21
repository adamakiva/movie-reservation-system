import type { NextFunction, Request } from 'express';
import pg from 'postgres';

import {
  ERROR_CODES,
  HTTP_STATUS_CODES,
  MRSError,
  strcasecmp,
  type RequestContext,
  type ResponseWithCtx,
  type ResponseWithoutCtx,
} from '../utils/index.js';

/**********************************************************************************/

function checkMethod(allowedMethods: Set<string>) {
  return (req: Request, res: ResponseWithoutCtx, next: NextFunction) => {
    if (!allowedMethods.has(req.method.toUpperCase())) {
      // Reason for explicitly adding the header:
      // https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Allow
      res
        .set('Allow', Array.from(allowedMethods).join(', '))
        .status(HTTP_STATUS_CODES.NOT_ALLOWED)
        .end();
      return;
    }

    next();
  };
}

function attachContext(requestContext: RequestContext) {
  return (_: Request, res: ResponseWithCtx, next: NextFunction) => {
    res.locals.context = requestContext;

    next();
  };
}

function handleMissedRoutes(req: Request, res: ResponseWithoutCtx) {
  res
    .status(HTTP_STATUS_CODES.NOT_FOUND)
    .json(`The route '${req.url}' does not exist`);
}

function errorHandler(
  err: unknown,
  _: Request,
  res: ResponseWithCtx,
  next: NextFunction,
) {
  if (res.headersSent) {
    next(err);
    return;
  }

  // The order is based on two things, type fallback and the chances of each error
  // happening. For example, TGMS error should be the most common error reason,
  // and it should be the first from that perspective
  if (err instanceof MRSError) {
    const { code, message } = err.getClientError();

    res.locals.context.logger.error(err);
    res.status(code).json(message);
    return;
  }
  if (err instanceof Error && !strcasecmp(err.name, 'PayloadTooLargeError')) {
    res
      .status(HTTP_STATUS_CODES.CONTENT_TOO_LARGE)
      .json('Request entity too large');
    return;
  }
  if (err instanceof pg.PostgresError) {
    handlePostgresError(err, res);
    return;
  }

  handleUnexpectedError(err, res);
}

/**********************************************************************************/

function handlePostgresError(err: pg.PostgresError, res: ResponseWithCtx) {
  const { FOREIGN_KEY_VIOLATION, UNIQUE_VIOLATION, TOO_MANY_CONNECTIONS } =
    ERROR_CODES.POSTGRES;
  const { logger } = res.locals.context;

  switch (err.code) {
    case FOREIGN_KEY_VIOLATION:
    case UNIQUE_VIOLATION:
      logger.error(
        err,
        'Should have been handled by the code and never get here. Check the' +
          ' code implementation',
      );
      break;
    case TOO_MANY_CONNECTIONS:
      logger.error(
        err,
        'Exceeded database maximum connections.\nThis Should never happen,' +
          ' check the server and database logs to understand why it happened',
      );
      break;
    default:
      logger.error(err, 'Unexpected database error');
      break;
  }

  res
    .status(HTTP_STATUS_CODES.SERVER_ERROR)
    .json('Unexpected error, please try again');
}

function handleUnexpectedError(err: unknown, res: ResponseWithCtx) {
  const { logger } = res.locals.context;
  if (err instanceof Error) {
    logger.error(err, 'Unhandled exception');
  } else {
    logger.error(err, 'Caught a non-error object.\nThis should never happen');
  }

  res
    .status(HTTP_STATUS_CODES.SERVER_ERROR)
    .json('Unexpected error, please try again');
}

/**********************************************************************************/

export { attachContext, checkMethod, errorHandler, handleMissedRoutes };
