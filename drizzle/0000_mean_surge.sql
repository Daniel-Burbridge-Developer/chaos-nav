CREATE TABLE "routes" (
	"id" text PRIMARY KEY NOT NULL,
	"agency_id" text NOT NULL,
	"short_name" text,
	"long_name" text,
	"type" integer NOT NULL,
	CONSTRAINT "routes_id_unique" UNIQUE("id")
);
--> statement-breakpoint
CREATE TABLE "shapes" (
	"id" integer PRIMARY KEY NOT NULL,
	"points" jsonb NOT NULL,
	CONSTRAINT "shapes_id_unique" UNIQUE("id")
);
--> statement-breakpoint
CREATE TABLE "stop_times" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"stops" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stops" (
	"number" integer PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"lat" real,
	"lon" real,
	"zone_id" integer
);
--> statement-breakpoint
CREATE TABLE "trips" (
	"trip_id" text PRIMARY KEY NOT NULL,
	"route_id" text NOT NULL,
	"service_id" text NOT NULL,
	"direction_id" integer,
	"trip_headsign" text,
	"shape_id" text
);
--> statement-breakpoint
CREATE INDEX "short_name_idx" ON "routes" USING btree ("short_name");--> statement-breakpoint
CREATE INDEX "long_name_idx" ON "routes" USING btree ("long_name");--> statement-breakpoint
CREATE INDEX "name_idx" ON "stops" USING btree ("name");--> statement-breakpoint
CREATE INDEX "route_id_idx" ON "trips" USING btree ("route_id");--> statement-breakpoint
CREATE INDEX "route_service_idx" ON "trips" USING btree ("route_id","service_id");--> statement-breakpoint
CREATE INDEX "shape_id_idx" ON "trips" USING btree ("shape_id");