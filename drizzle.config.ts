import { config } from 'dotenv';
import { defineConfig } from 'drizzle-kit';

config({ path: '.env' }); // Load environment variables from .env file

export default defineConfig({
  out: './drizzle',
  schema: './src/db/schema',
  dialect: 'turso',
  dbCredentials: {
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!,
  },
  verbose: true,
});
