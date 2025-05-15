import type { ServerResponse } from 'node:http';
import { inspect } from 'node:util';

import { HTTP_STATUS_CODES } from '@adamakiva/movie-reservation-system-shared';
import pg from 'postgres';

/**********************************************************************************/

type UnauthenticatedErrors = {
  // eslint-disable-next-line no-unused-vars
  [K in PossibleUnauthenticatedErrors[number]]: {
    message: string;
    header: string;
  };
};
type PossibleUnauthenticatedErrors = ['missing', 'malformed', 'expired'];

// See: https://datatracker.ietf.org/doc/html/rfc6750#section-3
const REALM = 'Bearer realm="movie_reservation_system"';
const AUTHENTICATION_HEADER_ERRORS = {
  missing: {
    message: 'Missing authorization header',
    header: REALM,
  },
  malformed: {
    message: 'Malformed JWT token',
    header: `${REALM}, error="invalid_token", error_description="Malformed access token"`,
  },
  expired: {
    message: 'JWT token expired',
    header: `${REALM}, error="invalid_token", error_description="The access token expired"`,
  },
} satisfies UnauthenticatedErrors;

/**********************************************************************************/

class GeneralError extends Error {
  readonly #message;
  readonly #statusCode;

  public constructor(statusCode: number, message: string, cause?: unknown) {
    super(message);
    Error.captureStackTrace(this, this.constructor);

    this.name = this.constructor.name;
    this.cause = cause;
    this.#statusCode = statusCode;
    this.#message = message;
  }

  public [inspect.custom]() {
    const stackTrace = this.stack
      ? `\nStack trace:\n${this.stack.split('\n').slice(1).join('\n')}`
      : '';

    let logMessage = `${this.#statusCode}: ${this.#message}${stackTrace}`;
    if (this.cause && this.cause instanceof Error) {
      logMessage += `\n[cause]: ${this.#formatError(this.cause)}`;
    }

    return logMessage;
  }

  // The unused variable exists to allow overrides of child classes
  // eslint-disable-next-line no-unused-vars
  public getClientError(_response: ServerResponse) {
    return {
      code: this.#statusCode,
      message: this.#message,
    } as const;
  }

  /********************************************************************************/

  #formatError(error: Error) {
    const header = `${error.name} - ${error.message}`;
    const stackTrace = error.stack
      ? `\nStack trace:\n${error.stack.split('\n').slice(1).join('\n')}`
      : '';
    // The function must have a return type to allow tsc to evaluate the recursion
    // correctly. See: https://github.com/microsoft/TypeScript/issues/43047
    const nestedCause: string =
      error.cause && error.cause instanceof Error
        ? `\n[cause]: ${this.#formatError(error.cause)}`
        : '';

    const formattedError = `${header}${stackTrace}${nestedCause}`;

    return formattedError;
  }
}

/**********************************************************************************/
/**********************************************************************************/

class UnauthorizedError extends GeneralError {
  readonly #reason;

  public constructor(
    reason: PossibleUnauthenticatedErrors[number],
    cause?: unknown,
  ) {
    super(
      HTTP_STATUS_CODES.UNAUTHORIZED,
      AUTHENTICATION_HEADER_ERRORS[reason].message,
      cause,
    );
    Error.captureStackTrace(this, this.constructor);

    this.name = this.constructor.name;
    this.#reason = reason;
  }

  public override getClientError(response: ServerResponse) {
    response.setHeader(
      'WWW-Authenticate',
      this.#getWWWAuthenticateHeaderValue(),
    );

    return super.getClientError(response);
  }

  /********************************************************************************/

  #getWWWAuthenticateHeaderValue() {
    return AUTHENTICATION_HEADER_ERRORS[this.#reason].header;
  }
}

/**********************************************************************************/

function isError(obj: unknown): obj is Error {
  return obj instanceof Error;
}

function isDatabaseError(obj: unknown): obj is pg.PostgresError {
  return obj instanceof pg.PostgresError;
}

function isSystemCallError(obj: unknown): obj is NodeJS.ErrnoException {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    Object.hasOwn(obj, 'errno') &&
    Object.hasOwn(obj, 'syscall')
  );
}

function registerAbortController(timeout: number, reason?: string) {
  const abortController = new AbortController();
  const timeoutHandler = setTimeout(() => {
    abortController.abort(reason);
  }, timeout);

  return {
    signal: abortController.signal,
    timeoutHandler,
  } as const;
}

/**********************************************************************************/

export {
  GeneralError,
  isDatabaseError,
  isError,
  isSystemCallError,
  registerAbortController,
  UnauthorizedError,
};
