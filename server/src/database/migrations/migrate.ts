import { Buffer } from 'node:buffer';

import { ERROR_CODES } from '@adamakiva/movie-reservation-system-shared';
import { argon2i, hash } from 'argon2';
import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import pg from 'postgres';

import * as schema from '../schemas.ts';

/**********************************************************************************/

const REQUIRED_ENVIRONMENT_VARIABLES = [
  'ADMIN_ROLE_ID',
  'ADMIN_ROLE_NAME',
  'ADMIN_EMAIL',
  'ADMIN_PASSWORD',
  'AUTHENTICATION_HASH_SECRET',
  'DATABASE_URL',
] as const;

/**********************************************************************************/

async function run() {
  const errorMessages: string[] = [];
  REQUIRED_ENVIRONMENT_VARIABLES.forEach((key) => {
    if (!process.env[key]) {
      errorMessages.push(`* Missing '${key}' environment variable`);
    }
  });

  if (errorMessages.length) {
    console.error(errorMessages.join('\n'));
    process.exit(ERROR_CODES.EXIT_NO_RESTART);
  }

  try {
    await migration(process.env.DATABASE_URL!);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(ERROR_CODES.EXIT_NO_RESTART);
  }
}

async function migration(databaseUrl: string) {
  const connection = pg(databaseUrl);
  const databaseHandler = drizzle(connection, { schema });

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
  databaseHandler: PostgresJsDatabase<typeof schema>;
  role: typeof schema.genreModel.$inferInsert;
  user: typeof schema.userModel.$inferInsert;
}) {
  const { databaseHandler, role, user } = params;

  await databaseHandler
    .insert(schema.roleModel)
    .values(role)
    .onConflictDoNothing();
  await databaseHandler
    .insert(schema.userModel)
    .values(user)
    .onConflictDoNothing();
}

/**********************************************************************************/

await run();
