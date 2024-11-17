import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import pg from 'postgres';

import * as schema from './schemas.js';

/**********************************************************************************/

const connection = pg(process.env.DB_URL!);
const dbHandler = drizzle(connection, { schema: schema });

migrate(dbHandler, { migrationsFolder: './src/db/migrations' }).finally(() => {
  connection.end();
});
