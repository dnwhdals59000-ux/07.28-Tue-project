import { env } from "cloudflare:workers";

type RuntimeEnv = {
  DB: D1Database;
  OPEN_EXCHANGE_RATES_APP_ID?: string;
};

type OpenExchangeResponse = {
  timestamp: number;
  base: string;
  rates: Record<string, number>;
};

function runtimeEnv() {
  return env as unknown as RuntimeEnv;
}

export class RatesConfigurationError extends Error {}

export async function syncLatestRates(force = false) {
  const { DB, OPEN_EXCHANGE_RATES_APP_ID } = runtimeEnv();
  if (!OPEN_EXCHANGE_RATES_APP_ID) {
    throw new RatesConfigurationError(
      "Open Exchange Rates API 키가 아직 등록되지 않았습니다.",
    );
  }

  const utcDate = new Date().toISOString().slice(0, 10);
  if (!force) {
    const saved = await DB.prepare(
      "SELECT COUNT(*) AS count FROM daily_rates WHERE rate_date = ?",
    )
      .bind(utcDate)
      .first<{ count: number }>();

    if ((saved?.count ?? 0) > 0) {
      return { date: utcDate, count: saved?.count ?? 0, cached: true };
    }
  }

  const response = await fetch(
    `https://openexchangerates.org/api/latest.json?app_id=${encodeURIComponent(OPEN_EXCHANGE_RATES_APP_ID)}`,
    { headers: { Accept: "application/json" } },
  );

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`환율 제공사 응답 오류 (${response.status}): ${message.slice(0, 180)}`);
  }

  const payload = (await response.json()) as OpenExchangeResponse;
  const rateDate = new Date(payload.timestamp * 1000).toISOString().slice(0, 10);
  const collectedAt = new Date().toISOString();
  const entries = Object.entries(payload.rates).filter(
    ([currency, rate]) => /^[A-Z0-9]{3,8}$/.test(currency) && Number.isFinite(rate),
  );

  for (let cursor = 0; cursor < entries.length; cursor += 75) {
    const statements = entries.slice(cursor, cursor + 75).map(([currency, rate]) =>
      DB.prepare(
        `INSERT INTO daily_rates
          (rate_date, base_currency, currency, rate, source_timestamp, collected_at)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(rate_date, currency) DO UPDATE SET
          rate = excluded.rate,
          source_timestamp = excluded.source_timestamp,
          collected_at = excluded.collected_at`,
      ).bind(
        rateDate,
        payload.base,
        currency,
        rate,
        payload.timestamp,
        collectedAt,
      ),
    );
    await DB.batch(statements);
  }

  await DB.prepare(
    `INSERT INTO sync_runs
      (rate_date, status, currency_count, message, created_at)
     VALUES (?, 'success', ?, ?, ?)`,
  )
    .bind(rateDate, entries.length, force ? "manual" : "daily", collectedAt)
    .run();

  return { date: rateDate, count: entries.length, cached: false };
}

export async function getRatesSnapshot(days: number, currencies: string[]) {
  const { DB } = runtimeEnv();
  const safeDays = Math.max(2, Math.min(days, 365));
  const safeCurrencies = currencies
    .filter((value) => /^[A-Z0-9]{3,8}$/.test(value))
    .slice(0, 12);

  const latestDates = await DB.prepare(
    "SELECT DISTINCT rate_date FROM daily_rates ORDER BY rate_date DESC LIMIT 2",
  ).all<{ rate_date: string }>();

  const latestDate = latestDates.results[0]?.rate_date ?? null;
  const previousDate = latestDates.results[1]?.rate_date ?? null;
  const latest = latestDate
    ? await DB.prepare(
        `SELECT currency, rate FROM daily_rates
         WHERE rate_date = ? ORDER BY currency`,
      )
        .bind(latestDate)
        .all<{ currency: string; rate: number }>()
    : { results: [] };

  const previous = previousDate
    ? await DB.prepare(
        "SELECT currency, rate FROM daily_rates WHERE rate_date = ?",
      )
        .bind(previousDate)
        .all<{ currency: string; rate: number }>()
    : { results: [] };

  let history: Array<{ rate_date: string; currency: string; rate: number }> = [];
  if (safeCurrencies.length) {
    const placeholders = safeCurrencies.map(() => "?").join(",");
    const result = await DB.prepare(
      `SELECT rate_date, currency, rate FROM daily_rates
       WHERE currency IN (${placeholders})
       AND rate_date >= date(COALESCE(?, 'now'), '-' || ? || ' days')
       ORDER BY rate_date ASC, currency ASC`,
    )
      .bind(...safeCurrencies, latestDate, safeDays)
      .all<{ rate_date: string; currency: string; rate: number }>();
    history = result.results;
  }

  const stats = await DB.prepare(
    `SELECT COUNT(DISTINCT rate_date) AS days,
            COUNT(DISTINCT currency) AS currencies,
            MIN(rate_date) AS first_date,
            MAX(rate_date) AS last_date
     FROM daily_rates`,
  ).first<{
    days: number;
    currencies: number;
    first_date: string | null;
    last_date: string | null;
  }>();

  const latestRun = await DB.prepare(
    `SELECT status, currency_count, created_at
     FROM sync_runs ORDER BY id DESC LIMIT 1`,
  ).first<{ status: string; currency_count: number; created_at: string }>();

  return {
    latestDate,
    previousDate,
    latest: latest.results,
    previous: previous.results,
    history,
    stats: stats ?? { days: 0, currencies: 0, first_date: null, last_date: null },
    latestRun: latestRun ?? null,
  };
}
