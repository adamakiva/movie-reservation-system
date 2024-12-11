import argon2 from 'argon2';
import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import pg from 'postgres';

// Import directly and not via index.ts to prevent importing the entire project
// and/or import issues with drizzle
import { ERROR_CODES } from '../../utils/constants.js';
import Logger, { type LoggerHandler } from '../../utils/logger.js';

import * as schemas from '../schemas.js';

/**********************************************************************************/

const MIGRATIONS_FOLDER = './src/database/migrations';

/**********************************************************************************/

async function seedInitialData(
  databaseHandler: PostgresJsDatabase<typeof schemas>,
) {
  const createdRoles = await databaseHandler
    .insert(schemas.roleModel)
    .values({
      id: process.env.ADMIN_ROLE_ID!,
      name: process.env.ADMIN_ROLE_NAME!,
    })
    .returning({ roleId: schemas.roleModel.id })
    .onConflictDoNothing();
  if (!createdRoles.length) {
    return;
  }
  const { roleId } = createdRoles[0]!;

  await databaseHandler
    .insert(schemas.userModel)
    .values({
      firstName: 'admin',
      lastName: 'admin',
      email: process.env.ADMIN_EMAIL!,
      hash: await argon2.hash(process.env.ADMIN_PASSWORD!, {
        type: 1,
        secret: Buffer.from(process.env.HASH_SECRET!),
      }),
      roleId,
    })
    .onConflictDoNothing();
}

async function migration(databaseUrl: string, logger: LoggerHandler) {
  const connection = pg(databaseUrl);
  const databaseHandler = drizzle(connection, { schema: schemas });

  try {
    await migrate(databaseHandler, { migrationsFolder: MIGRATIONS_FOLDER });
    await seedInitialData(databaseHandler);
  } catch (err) {
    throw new Error(`Migration failed for ${databaseUrl}`, { cause: err });
  } finally {
    try {
      await connection.end({ timeout: 30 });
    } catch (err) {
      // No point in propagating it, because there is nothing to do with it
      logger.fatal(`Error closing database connection for ${databaseUrl}`, err);
    }
  }
}

/**
 * This function may return a promise or not, depending on whether the required
 * environment variables exist.
 *
 * Normally this is bad practice because due to different error handling.
 *
 * However in this case, all errors are handled by shutting down the process and
 * are not propagated down the caller chain.
 */
//@ts-expect-error On purpose, see the above comment
// eslint-disable-next-line consistent-return
function run() {
  const logger = new Logger().getHandler();

  const environmentVariables = new Map([
    ['ADMIN_ROLE_ID', process.env.ADMIN_ROLE_ID],
    ['ADMIN_ROLE_NAME', process.env.ADMIN_ROLE_NAME],
    ['ADMIN_EMAIL', process.env.ADMIN_EMAIL],
    ['ADMIN_PASSWORD', process.env.ADMIN_PASSWORD],
    ['HASH_SECRET', process.env.HASH_SECRET],
  ] as const);
  const databaseUrls = new Map([['DATABASE_URL', process.env.DATABASE_URL]]);
  if (process.env.NODE_ENV !== 'production') {
    databaseUrls.set('DATABASE_TEST_URL', process.env.DATABASE_TEST_URL);
  }

  const errorMessages: string[] = [];
  new Map([...environmentVariables, ...databaseUrls]).forEach((value, key) => {
    if (!value) {
      errorMessages.push(`* Missing '${key}' environment variable`);
    }
  });

  if (!errorMessages.length) {
    return Promise.all(
      databaseUrls.values().map((databaseUrl) => {
        return migration(databaseUrl!, logger);
      }),
    ).catch((err: unknown) => {
      logger.fatal('Migration failed:', err);
      process.exitCode = ERROR_CODES.EXIT_NO_RESTART;
    });
  }

  logger.fatal(errorMessages.join('\n'));
  process.exitCode = ERROR_CODES.EXIT_NO_RESTART;
}

/**********************************************************************************/

// On purpose, see this function documentation
// eslint-disable-next-line @typescript-eslint/no-floating-promises
run();
