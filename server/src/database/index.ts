import { ERROR_CODES } from '@adamakiva/movie-reservation-system-shared';
import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import pg from 'postgres';

import type { Logger } from '../utils/logger.ts';

import { DatabaseLogger } from './logger.ts';
/* The default import is on purpose. See: https://orm.drizzle.team/docs/sql-schema-declaration */
import * as schema from './schemas.ts';

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

    const connection = pg(url, options);

    this.#handler = drizzle(connection, {
      schema,
      logger: new DatabaseLogger(new Set([isAliveQuery, isReadyQuery]), logger),
    });
    this.#models = {
      role: schema.roleModel,
      user: schema.userModel,
      genre: schema.genreModel,
      movie: schema.movieModel,
      moviePoster: schema.moviePosterModel,
      hall: schema.hallModel,
      showtime: schema.showtimeModel,
      userShowtime: schema.usersShowtimesModel,
    } as const;

    this.#isAliveQuery = isAliveQuery;
    this.#isReadyQuery = isReadyQuery;
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

function isDatabaseError(obj: unknown): obj is pg.PostgresError {
  return obj instanceof pg.PostgresError;
}

function isForeignKeyViolationError(error: Error) {
  return (
    isDatabaseError(error.cause) &&
    error.cause.code === ERROR_CODES.POSTGRES.FOREIGN_KEY_VIOLATION
  );
}

function isUniqueViolationError(error: Error) {
  return (
    isDatabaseError(error.cause) &&
    error.cause.code === ERROR_CODES.POSTGRES.UNIQUE_VIOLATION
  );
}

/**********************************************************************************/

export {
  Database,
  isDatabaseError,
  isForeignKeyViolationError,
  isUniqueViolationError,
};
