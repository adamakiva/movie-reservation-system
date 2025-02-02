import type { Logger as DrizzleLogger } from 'drizzle-orm';

import type { LoggerHandler } from '../utils/index.js';

/**********************************************************************************/

class DatabaseLogger implements DrizzleLogger {
  readonly #healthCheckQuery;
  readonly #logger;

  public constructor(healthCheckQuery: string, logger: LoggerHandler) {
    this.#healthCheckQuery = healthCheckQuery;
    this.#logger = logger;
  }

  public logQuery(query: string, params: unknown[]) {
    if (this.#healthCheckQuery !== query) {
      this.#logger.debug(`Database query:\n%o\nParams: %o`, query, params);
    }
  }
}

/**********************************************************************************/

export default DatabaseLogger;
