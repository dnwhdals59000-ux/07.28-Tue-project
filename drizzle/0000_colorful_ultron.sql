CREATE TABLE `daily_rates` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`rate_date` text NOT NULL,
	`base_currency` text DEFAULT 'USD' NOT NULL,
	`currency` text NOT NULL,
	`rate` real NOT NULL,
	`source_timestamp` integer NOT NULL,
	`collected_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `daily_rates_date_currency_unique` ON `daily_rates` (`rate_date`,`currency`);--> statement-breakpoint
CREATE INDEX `daily_rates_currency_date_idx` ON `daily_rates` (`currency`,`rate_date`);--> statement-breakpoint
CREATE TABLE `sync_runs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`rate_date` text NOT NULL,
	`status` text NOT NULL,
	`currency_count` integer DEFAULT 0 NOT NULL,
	`message` text,
	`created_at` text NOT NULL
);
