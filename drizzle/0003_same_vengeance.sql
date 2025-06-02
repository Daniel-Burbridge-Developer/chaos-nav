DROP TABLE "stop_times" CASCADE;--> statement-breakpoint
ALTER TABLE "trips" ADD COLUMN "stops" jsonb;