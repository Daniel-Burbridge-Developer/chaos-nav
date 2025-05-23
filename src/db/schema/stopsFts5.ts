import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { type InferSelectModel } from "drizzle-orm";
import { stops } from "./stops"; // Assuming your original 'stops' table definition

// Define the FTS5 virtual table
// Drizzle ORM does not support FTS5 virtual tables directly, so use raw SQL for the FTS5 table definition.
import { sql } from "drizzle-orm";

export const createStopsFts = sql`
  CREATE VIRTUAL TABLE IF NOT EXISTS stops_fts
  USING fts5(
    name,
    number,
    content='stops',
    content_rowid='rowid'
  );
`;

// You can execute `createStopsFts` during your migration or setup phase.

// Optionally, define a type for querying the FTS table:
export type StopFts = {
  rowid: number;
  name: string;
  number: string;
};
