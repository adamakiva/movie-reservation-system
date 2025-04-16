/* eslint-disable max-classes-per-file */

import { inspect } from 'node:util';

import { HTTP_STATUS_CODES } from '@adamakiva/movie-reservation-system-shared';
import type { Response } from 'express';

/**********************************************************************************/

type UnauthenticatedErrors = {
  // eslint-disable-next-line no-unused-vars
  [K in PossibleUnauthenticatedErrors[number]]: {
    message: string;
    header: string;
  };
};
type PossibleUnauthenticatedErrors = ['missing', 'malformed', 'expired'];

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
  public getClientError(_response: Response) {
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
  // See: https://datatracker.ietf.org/doc/html/rfc6750#section-3
  static readonly #realm = 'Bearer realm="movie_reservation_system"';
  static readonly #errors = {
    missing: {
      message: 'Missing authorization header',
      header: UnauthorizedError.#realm,
    },
    malformed: {
      message: 'Malformed JWT token',
      header: `${UnauthorizedError.#realm}, error="invalid_token", error_description="Malformed access token"`,
    },
    expired: {
      message: 'JWT token expired',
      header: `${UnauthorizedError.#realm}, error="invalid_token", error_description="The access token expired"`,
    },
  } as const satisfies UnauthenticatedErrors;

  readonly #reason;

  public constructor(
    reason: PossibleUnauthenticatedErrors[number],
    cause?: unknown,
  ) {
    super(
      HTTP_STATUS_CODES.UNAUTHORIZED,
      UnauthorizedError.#errors[reason].message,
      cause,
    );
    Error.captureStackTrace(this, this.constructor);

    this.name = this.constructor.name;
    this.#reason = reason;
  }

  public override getClientError(response: Response) {
    response.setHeader(
      'WWW-Authenticate',
      this.#getWWWAuthenticateHeaderValue(),
    );

    return super.getClientError(response);
  }

  /********************************************************************************/

  #getWWWAuthenticateHeaderValue() {
    return UnauthorizedError.#errors[this.#reason].header;
  }
}

/**********************************************************************************/

export { GeneralError, UnauthorizedError };
