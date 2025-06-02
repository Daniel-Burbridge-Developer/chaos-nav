import { config } from 'dotenv';
import { defineConfig } from 'drizzle-kit';

config({ path: '.env' }); // Load environment variables from .env file

export default defineConfig({
  out: './drizzle',
  schema: './src/db/schema',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  verbose: true,
});
