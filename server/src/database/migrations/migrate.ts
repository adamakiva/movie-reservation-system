import { Buffer } from 'node:buffer';

import { ERROR_CODES } from '@adamakiva/movie-reservation-system-shared';
import { argon2i, hash } from 'argon2';
import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import pg from 'postgres';

import * as schemas from '../schemas.ts';

/**********************************************************************************/

async function run() {
  const environmentVariables = new Map([
    ['ADMIN_ROLE_ID', process.env.ADMIN_ROLE_ID],
    ['ADMIN_ROLE_NAME', process.env.ADMIN_ROLE_NAME],
    ['ADMIN_EMAIL', process.env.ADMIN_EMAIL],
    ['ADMIN_PASSWORD', process.env.ADMIN_PASSWORD],
    ['AUTHENTICATION_HASH_SECRET', process.env.AUTHENTICATION_HASH_SECRET],
  ] as const);
  const databaseUrls = new Map([['DATABASE_URL', process.env.DATABASE_URL]]);
  if (process.env.DATABASE_TEST_URL) {
    databaseUrls.set('DATABASE_TEST_URL', process.env.DATABASE_TEST_URL);
  }

  const errorMessages: string[] = [];
  new Map([...environmentVariables, ...databaseUrls] as const).forEach(
    (value, key) => {
      if (!value) {
        errorMessages.push(`* Missing '${key}' environment variable`);
      }
    },
  );

  if (!errorMessages.length) {
    try {
      await Promise.all(
        databaseUrls.values().map((databaseUrl) => {
          return migration(databaseUrl!);
        }),
      );
    } catch (error) {
      console.error('Migration failed:', error);
      process.exit(ERROR_CODES.EXIT_NO_RESTART);
    }
    return;
  }

  console.error(errorMessages.join('\n'));
  process.exit(ERROR_CODES.EXIT_NO_RESTART);
}

async function migration(databaseUrl: string) {
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
        firstName: 'admin',
        lastName: 'admin',
        email: process.env.ADMIN_EMAIL!,
        hash: await hash(process.env.ADMIN_PASSWORD!, {
          type: argon2i,
          secret: Buffer.from(process.env.AUTHENTICATION_HASH_SECRET!),
        }),
        roleId: process.env.ADMIN_ROLE_ID!,
      },
    });
  } catch (error) {
    throw new Error(`Migration failed for ${databaseUrl}`, { cause: error });
  } finally {
    try {
      await connection.end({ timeout: 10 }); // in seconds
    } catch (error) {
      console.error(
        `Error closing database connection for ${databaseUrl}`,
        error,
      );

      process.exit(ERROR_CODES.EXIT_NO_RESTART);
    }
  }
}

async function seedInitialData(params: {
  databaseHandler: PostgresJsDatabase<typeof schemas>;
  role: typeof schemas.genreModel.$inferInsert;
  user: typeof schemas.userModel.$inferInsert;
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

/**********************************************************************************/

await run();
