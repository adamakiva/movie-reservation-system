import type { NextFunction, Request, Response } from 'express';

/**********************************************************************************/

class Logger {
  public debug(...args: unknown[]) {
    console.debug(...args);
  }

  public info(...args: unknown[]) {
    console.info(...args);
  }

  public log(...args: unknown[]) {
    console.log(...args);
  }

  public warn(...args: unknown[]) {
    console.warn(...args);
  }

  public error(...args: unknown[]) {
    console.error(...args);
  }

  public logMiddleware = (
    _request: Request,
    _response: Response,
    next: NextFunction,
  ) => {
    this.log('PH');

    next();
  };
}

/**********************************************************************************/

export { Logger };
