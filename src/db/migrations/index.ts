import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import pg from 'postgres';

import * as schemas from '../schemas.js';

/**********************************************************************************/

const connection = pg(process.env.DB_URL!);
const dbHandler = drizzle(connection, { schema: schemas });

try {
  await migrate(dbHandler, { migrationsFolder: './src/db/migrations' });
} catch (err) {
  console.error('Error committing database migrations:', err);
  await connection.end({ timeout: 10 });
}
