import { config } from 'dotenv';
import { defineConfig } from 'drizzle-kit';

const ENV_FILE_MAP: Record<string, string> = {
  production: '.env.production',
  development: '.env',
};

config({
  path: ENV_FILE_MAP[process.env.NODE_ENV ?? 'development'] ?? '.env',
  override: true,
});

export default defineConfig({
  schema: './src/database/sqlite/schemas/index.ts',
  out: './drizzle',
  dialect: 'sqlite',
  dbCredentials: {
    url: process.env.SQLITE_URL ?? './data/tracker.db',
  },
});
