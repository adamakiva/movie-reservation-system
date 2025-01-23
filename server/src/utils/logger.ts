import type { NextFunction, Request, Response } from 'express';

/**********************************************************************************/

type LoggerHandler = ReturnType<Logger['getHandler']>;
type LogMiddleware = ReturnType<Logger['getLogMiddleware']>;

/**********************************************************************************/

class Logger {
  readonly #handler;

  public constructor() {
    this.#handler = {
      debug: this.#debug.bind(this),
      info: this.#info.bind(this),
      log: this.#log.bind(this),
      warn: this.#warn.bind(this),
      error: this.#error.bind(this),
      fatal: this.#fatal.bind(this),
    } as const;
  }

  public getHandler() {
    return this.#handler;
  }

  public getLogMiddleware() {
    return this.#logMiddleware.bind(this);
  }

  /********************************************************************************/

  #debug(...args: unknown[]) {
    console.debug(...args);
  }

  #info(...args: unknown[]) {
    console.info(...args);
  }

  #log(...args: unknown[]) {
    console.log(...args);
  }

  #warn(...args: unknown[]) {
    console.warn(...args);
  }

  #error(...args: unknown[]) {
    console.error(...args);
  }

  #fatal(...args: unknown[]) {
    console.error(...args);
  }

  #logMiddleware(_req: Request, _res: Response, next: NextFunction) {
    this.#log('PH');

    next();
  }
}

/**********************************************************************************/

export default Logger;
export type { LoggerHandler, LogMiddleware };
