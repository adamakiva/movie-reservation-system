import type { NextFunction, Request, Response } from 'express';

/**********************************************************************************/

class Logger {
  readonly #handler;

  /********************************************************************************/

  public constructor() {
    this.#handler = {
      debug: this.#debug.bind(this),
      info: this.#info.bind(this),
      log: this.#log.bind(this),
      warn: this.#warn.bind(this),
      error: this.#error.bind(this),
    };
  }

  getHandler() {
    return this.#handler;
  }

  getLogMiddleware() {
    return this.#logMiddleware.bind(this);
  }

  /********************************************************************************/

  #debug(...args: unknown[]) {
    console.debug(args);
  }

  #info(...args: unknown[]) {
    console.info(args);
  }

  #log(...args: unknown[]) {
    console.log(args);
  }

  #warn(...args: unknown[]) {
    console.warn(args);
  }

  #error(...args: unknown[]) {
    console.error(args);
  }

  #logMiddleware(req: Request, res: Response, next: NextFunction) {}
}

/**********************************************************************************/

export default Logger;
