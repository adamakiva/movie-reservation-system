import { type Config, defineConfig } from 'drizzle-kit';

/**********************************************************************************/

export default defineConfig({
  dialect: 'postgresql',
  verbose: true,
  strict: true,
  schema: './src/database/schemas.ts',
  out: './src/database/migrations',
} satisfies Config);
