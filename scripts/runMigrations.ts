import { drizzle } from 'drizzle-orm/libsql';
import { migrate } from 'drizzle-orm/libsql/migrator';
import { createClient } from '@libsql/client';
import { config } from 'dotenv';

config({ path: '.env' });

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!, // Replace with your actual Turso DB URL
  authToken: process.env.TURSO_AUTH_TOKEN!, // Replace with your Turso DB token
});

const db = drizzle(client);

await migrate(db, { migrationsFolder: './drizzle' });

console.log('✅ Turso migrations applied');
