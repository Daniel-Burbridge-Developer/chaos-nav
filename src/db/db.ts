import 'dotenv/config';
import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless'; // Import the Neon client
import { schema } from './schema'; // Import your combined schema

const sql = neon(process.env.DATABASE_URL!); // Initialize the Neon client

export const db = drizzle(sql, { schema }); // Pass the schema to drizzle
