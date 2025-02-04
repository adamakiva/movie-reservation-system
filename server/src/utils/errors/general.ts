import { inspect } from 'node:util';

import type { Response } from 'express';

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
  public getClientError(_res: Response) {
    return {
      code: this.#statusCode,
      message: this.#message,
    } as const;
  }

  /********************************************************************************/

  #formatError(err: Error) {
    const header = `${err.name} - ${err.message}`;
    const stackTrace = err.stack
      ? `\nStack trace:\n${err.stack.split('\n').slice(1).join('\n')}`
      : '';
    // The function must have a return type to allow tsc to evaluate the recursion
    // correctly. See: https://github.com/microsoft/TypeScript/issues/43047
    const nestedCause: string =
      err.cause && err.cause instanceof Error
        ? `\n[cause]: ${this.#formatError(err.cause)}`
        : '';

    const formattedError = `${header}${stackTrace}${nestedCause}`;

    return formattedError;
  }
}

/**********************************************************************************/

export default GeneralError;
