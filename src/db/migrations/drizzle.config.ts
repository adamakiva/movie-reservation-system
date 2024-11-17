import { type Config, defineConfig } from 'drizzle-kit';

/**********************************************************************************/

// See: https://orm.drizzle.team/kit-docs/config-reference
const drizzleConfig: Config = {
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DB_URL!,
  },
  verbose: true,
  strict: true,
  schema: './src/db/schemas.ts',
  out: './src/db/migrations',
};

/**********************************************************************************/

export default defineConfig(drizzleConfig);
