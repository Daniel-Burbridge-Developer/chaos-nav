PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_stops` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`number` text NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_stops`("id", "name", "number") SELECT "id", "name", "number" FROM `stops`;--> statement-breakpoint
DROP TABLE `stops`;--> statement-breakpoint
ALTER TABLE `__new_stops` RENAME TO `stops`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `number_idx` ON `stops` (`number`);