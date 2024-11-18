import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import pg from 'postgres';

import * as schemas from '../schemas.js';

/**********************************************************************************/

const MIGRATIONS_FOLDER = './src/db/migrations';

/**********************************************************************************/

async function migration(dbUrl: string) {
  const connection = pg(dbUrl);
  const dbHandler = drizzle(connection, { schema: schemas });

  try {
    await migrate(dbHandler, { migrationsFolder: MIGRATIONS_FOLDER });
  } catch (err) {
    throw new Error(`Migration failed for ${dbUrl}`, { cause: err });
  } finally {
    try {
      await connection.end({ timeout: 30 });
    } catch (err) {
      // No point in propagating it, because there is nothing to do with it
      console.error(`Error closing database connection for ${dbUrl}`, err);
    }
  }
}

/**
 * This function may return a promise or not, depending on whether the required
 * environment variables exist.
 *
 * Normally this is bad practice because how would you handle errors?
 *
 * However in this case, all errors are handled by shutting down the process and
 * are not propagated down the caller chain.
 */
function run() {
  const dbUrls = new Map([['DB_URL', process.env.DB_URL]]);
  if (process.env.NODE_ENV !== 'production') {
    dbUrls.set('DB_TEST_URL', process.env.DB_TEST_URL);
  }

  const errMessages: string[] = [];
  dbUrls.forEach((value, key) => {
    if (!value) {
      errMessages.push(`* Missing '${key}' environment variable`);
    }
  });

  if (!errMessages.length) {
    return Promise.all(
      dbUrls.values().map((dbUrl) => {
        return migration(dbUrl!);
      }),
    ).catch((err) => {
      console.error('Migration failed:', err);
      process.exitCode = 1;
    });
  }

  console.error(errMessages.join('\n'));
  process.exitCode = 1;

  return;
}

/**********************************************************************************/

run();
