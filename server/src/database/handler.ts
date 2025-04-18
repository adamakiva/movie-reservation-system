import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import pg from 'postgres';

import type { Logger } from '../utils/logger.ts';

import { DatabaseLogger } from './logger.ts';
/* The default import is on purpose. See: https://orm.drizzle.team/docs/sql-schema-declaration */
import * as schemas from './schemas.ts';

/**********************************************************************************/

class Database {
  readonly #handler;
  readonly #models;

  readonly #isAliveQuery;
  readonly #isReadyQuery;

  // In regards to using handler and transaction interchangeably, have a look at:
  // https://www.answeroverflow.com/m/1164318289674125392
  // In short, it does not matter, handler and transaction are same except
  // for a rollback method, which is called automatically if a throw occurs

  public constructor(params: {
    url: string;
    options?: pg.Options<{}>;
    isAliveQuery: string;
    isReadyQuery: string;
    logger: Logger;
  }) {
    const { url, options, isAliveQuery, isReadyQuery, logger } = params;

    this.#isAliveQuery = isAliveQuery;
    this.#isReadyQuery = isReadyQuery;

    // Note about transactions, postgres.ts and drizzle:
    // Postgres.ts create prepared statements per connection which lasts 60 minutes
    // (according to the settings we've supplied). Using drizzle with prepared
    // statements (which is a lie, see the description in `handler.ts` file)
    // make an additional query before and after the transaction for something
    // we could not understand. However, since every transaction use a connection,
    // that means that the number of transactions which can occur concurrently
    // is at the very least the number of transaction * 2. We suggest also
    // allowing a couple of additional connections (just to be sure). In
    // addition to that, the max default number of concurrent postgres
    // connection is 100. When this number is reached postgres will throw
    // an exception. When the number of connections is not enough (at
    // least transaction * 2) the database will get stuck since no one
    // frees any connections and the server will get stuck as a result.
    // Currently we have no good way to resolve this
    const connection = pg(url, options ?? {});
    this.#handler = drizzle(connection, {
      schema: schemas,
      logger: new DatabaseLogger([isAliveQuery, isReadyQuery] as const, logger),
    });

    this.#models = {
      role: schemas.roleModel,
      user: schemas.userModel,
      genre: schemas.genreModel,
      movie: schemas.movieModel,
      moviePoster: schemas.moviePosterModel,
      hall: schemas.hallModel,
      showtime: schemas.showtimeModel,
      userShowtime: schemas.usersShowtimesModel,
    } as const;
  }

  public async close() {
    await this.#handler.$client.end({ timeout: 10 }); // in seconds
  }

  public async isAlive() {
    await this.#execute(this.#isAliveQuery);
  }

  public async isReady() {
    await this.#execute(this.#isReadyQuery);
  }

  public getHandler() {
    return this.#handler;
  }

  public getModels() {
    return this.#models;
  }

  /********************************************************************************/

  async #execute(query: string) {
    await this.#handler.execute(sql.raw(query));
  }
}

/**********************************************************************************/

export { Database };
