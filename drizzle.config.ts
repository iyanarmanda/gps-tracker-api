import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/database/sqlite/schemas/index.ts',
  out: './drizzle',
  dialect: 'sqlite',
  dbCredentials: {
    url: process.env.SQLITE_URL ?? './data/tracker.db',
  },
});
