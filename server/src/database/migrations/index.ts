import { hash } from 'argon2';
import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import pg from 'postgres';

import { ERROR_CODES, Logger, type LoggerHandler } from '../../utils/index.js';

import * as schemas from '../schemas.js';

/**********************************************************************************/

type Role = typeof schemas.genreModel.$inferInsert;
type User = typeof schemas.userModel.$inferInsert;

/**********************************************************************************/

const DEFAULT_ADMIN_FIRST_NAME = 'admin';
const DEFAULT_ADMIN_LAST_NAME = 'admin';

/**********************************************************************************/

async function seedInitialData(params: {
  databaseHandler: PostgresJsDatabase<typeof schemas>;
  role: Role;
  user: User;
}) {
  const { databaseHandler, role, user } = params;

  await databaseHandler
    .insert(schemas.roleModel)
    .values(role)
    .onConflictDoNothing();
  await databaseHandler
    .insert(schemas.userModel)
    .values(user)
    .onConflictDoNothing();
}

async function migration(databaseUrl: string, logger: LoggerHandler) {
  const connection = pg(databaseUrl);
  const databaseHandler = drizzle(connection, { schema: schemas });

  try {
    await migrate(databaseHandler, { migrationsFolder: import.meta.dirname });

    await seedInitialData({
      databaseHandler,
      role: {
        id: process.env.ADMIN_ROLE_ID!,
        name: process.env.ADMIN_ROLE_NAME!,
      },
      user: {
        firstName: DEFAULT_ADMIN_FIRST_NAME,
        lastName: DEFAULT_ADMIN_LAST_NAME,
        email: process.env.ADMIN_EMAIL!,
        hash: await hash(process.env.ADMIN_PASSWORD!, {
          type: 1,
          secret: Buffer.from(process.env.HASH_SECRET!),
        }),
        roleId: process.env.ADMIN_ROLE_ID!,
      },
    });
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
  if (process.env.DATABASE_TEST_URL) {
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
