import type { Response } from 'express';

import { HTTP_STATUS_CODES } from '../constants.ts';

import GeneralError from './general.ts';

/**********************************************************************************/

type PossibleUnauthenticatedErrors = ['missing', 'malformed', 'expired'];

/**********************************************************************************/

class UnauthorizedError extends GeneralError {
  // See: https://datatracker.ietf.org/doc/html/rfc6750#section-3
  static readonly #realm = 'Bearer realm="movie_reservation_system"';
  static readonly #errors: {
    // eslint-disable-next-line no-unused-vars
    [K in PossibleUnauthenticatedErrors[number]]: string;
  } = {
    missing: UnauthorizedError.#realm,
    malformed: `${UnauthorizedError.#realm}, error="invalid_token", error_description="Malformed access token"`,
    expired: `${UnauthorizedError.#realm}, error="invalid_token", error_description="The access token expired"`,
  } as const;

  readonly #reason;

  public constructor(
    reason: PossibleUnauthenticatedErrors[number],
    cause?: unknown,
  ) {
    super(HTTP_STATUS_CODES.UNAUTHORIZED, 'Unauthorized', cause);
    Error.captureStackTrace(this, this.constructor);

    this.name = this.constructor.name;
    this.#reason = reason;
  }

  public override getClientError(res: Response) {
    res.setHeader('WWW-Authenticate', this.#getWWWAuthenticateHeaderValue());

    return super.getClientError(res);
  }

  /********************************************************************************/

  #getWWWAuthenticateHeaderValue() {
    return UnauthorizedError.#errors[this.#reason];
  }
}

/**********************************************************************************/

export default UnauthorizedError;
