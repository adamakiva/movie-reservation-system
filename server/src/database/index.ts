import { ERROR_CODES } from '@adamakiva/movie-reservation-system-shared';
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

    const connection = pg(url, options);
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

function isDatabaseError(obj: unknown): obj is pg.PostgresError {
  return obj instanceof pg.PostgresError;
}

function isForeignKeyViolationError(error: unknown) {
  return (
    isDatabaseError(error) &&
    error.code === ERROR_CODES.POSTGRES.FOREIGN_KEY_VIOLATION
  );
}

function isUniqueViolationError(error: unknown) {
  return (
    isDatabaseError(error) &&
    error.code === ERROR_CODES.POSTGRES.UNIQUE_VIOLATION
  );
}

/**********************************************************************************/

export {
  Database,
  isDatabaseError,
  isForeignKeyViolationError,
  isUniqueViolationError,
};
