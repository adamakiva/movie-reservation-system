import { type Config, defineConfig } from 'drizzle-kit';

/**********************************************************************************/

export default defineConfig({
  dialect: 'postgresql',
  verbose: true,
  strict: true,
  schema: './src/db/schemas.ts',
  out: './src/db/migrations',
} satisfies Config);
