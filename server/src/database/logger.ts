import type { Logger as DrizzleLogger } from 'drizzle-orm';

import type { Logger } from '../utils/logger.ts';

/**********************************************************************************/

class DatabaseLogger implements DrizzleLogger {
  readonly #queriesToIgnore;
  readonly #logger;

  public constructor(queries: readonly string[], logger: Logger) {
    this.#queriesToIgnore = queries;
    this.#logger = logger;
  }

  public logQuery(query: string, params: readonly unknown[]) {
    if (!this.#queriesToIgnore.includes(query)) {
      this.#logger.debug(`Database query:\n%o\nParams: %o`, query, params);
    }
  }
}

/**********************************************************************************/

export { DatabaseLogger };
