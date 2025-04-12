import type { Logger as DrizzleLogger } from 'drizzle-orm';

import type { LoggerHandler } from '../utils/index.ts';

/**********************************************************************************/

class DatabaseLogger implements DrizzleLogger {
  readonly #queriesToIgnore;
  readonly #logger;

  public constructor(queries: Set<string>, logger: LoggerHandler) {
    this.#queriesToIgnore = queries;
    this.#logger = logger;
  }

  public logQuery(query: string, params: unknown[]) {
    if (!this.#queriesToIgnore.has(query)) {
      this.#logger.debug(`Database query:\n%o\nParams: %o`, query, params);
    }
  }
}

/**********************************************************************************/

export default DatabaseLogger;
