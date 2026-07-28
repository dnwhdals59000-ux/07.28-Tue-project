import { index, integer, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const dailyRates = sqliteTable(
  "daily_rates",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    rateDate: text("rate_date").notNull(),
    baseCurrency: text("base_currency").notNull().default("USD"),
    currency: text("currency").notNull(),
    rate: real("rate").notNull(),
    sourceTimestamp: integer("source_timestamp").notNull(),
    collectedAt: text("collected_at").notNull(),
  },
  (table) => [
    uniqueIndex("daily_rates_date_currency_unique").on(
      table.rateDate,
      table.currency,
    ),
    index("daily_rates_currency_date_idx").on(table.currency, table.rateDate),
  ],
);

export const syncRuns = sqliteTable("sync_runs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  rateDate: text("rate_date").notNull(),
  status: text("status").notNull(),
  currencyCount: integer("currency_count").notNull().default(0),
  message: text("message"),
  createdAt: text("created_at").notNull(),
});
