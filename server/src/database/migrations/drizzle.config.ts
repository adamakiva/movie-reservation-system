import { defineConfig } from 'drizzle-kit';

/**********************************************************************************/

const config = defineConfig({
  dialect: 'postgresql',
  verbose: true,
  strict: true,
  schema: './src/database/schemas.ts',
  out: './src/database/migrations',
});

/**********************************************************************************/

export default config;
