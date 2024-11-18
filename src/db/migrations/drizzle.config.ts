import { type Config, defineConfig } from 'drizzle-kit';

/**********************************************************************************/

const drizzleConfig: Config = {
  dialect: 'postgresql',
  verbose: true,
  strict: true,
  schema: './src/db/schemas.ts',
  out: './src/db/migrations',
};

/**********************************************************************************/

export default defineConfig(drizzleConfig);
