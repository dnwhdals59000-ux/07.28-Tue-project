import { env } from "cloudflare:workers";

type RuntimeEnv = { DB: D1Database };
type RateRecord = {
  currency: string;
  rate: number;
  base_currency: string;
  collected_at: string;
};

function csvCell(value: string | number | null) {
  const text = value == null ? "" : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

function formatNumber(value: number | null, digits = 6) {
  if (value == null || !Number.isFinite(value)) return "";
  return value.toFixed(digits);
}

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const DB = (env as unknown as RuntimeEnv).DB;
  const url = new URL(request.url);
  const range = url.searchParams.get("range");

  if (range === "month" || range === "custom") {
    const latestDate = (
      await DB.prepare("SELECT MAX(rate_date) AS rate_date FROM daily_rates")
        .first<{ rate_date: string | null }>()
    )?.rate_date;

    if (!latestDate) {
      return Response.json(
        { error: "다운로드할 환율 데이터가 없습니다." },
        { status: 404 },
      );
    }

    const requestedFrom = url.searchParams.get("from");
    const requestedTo = url.searchParams.get("to");
    const isDate = (value: string | null): value is string =>
      Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value));
    const fromDate = isDate(requestedFrom)
      ? requestedFrom
      : new Date(`${latestDate}T00:00:00Z`);
    const toDate = isDate(requestedTo) ? requestedTo : latestDate;

    if (typeof fromDate !== "string") {
      fromDate.setUTCDate(fromDate.getUTCDate() - 30);
    }
    const fromValue = typeof fromDate === "string"
      ? fromDate
      : fromDate.toISOString().slice(0, 10);
    const fromTime = Date.parse(`${fromValue}T00:00:00Z`);
    const toTime = Date.parse(`${toDate}T00:00:00Z`);
    if (!Number.isFinite(fromTime) || !Number.isFinite(toTime) || fromTime > toTime || toTime - fromTime > 30 * 24 * 60 * 60 * 1000) {
      return Response.json(
        { error: "다운로드 범위는 시작일과 종료일을 포함한 최대 1개월로 선택해주세요." },
        { status: 400 },
      );
    }

    const month = await DB.prepare(
      `SELECT rate_date, currency, rate, base_currency, collected_at
       FROM daily_rates
       WHERE rate_date >= ? AND rate_date <= ?
       ORDER BY rate_date ASC, currency ASC`,
    )
      .bind(fromValue, toDate)
      .all<RateRecord & { rate_date: string }>();

    const rows = [
      [
        "기준일",
        "통화코드",
        "기준통화",
        "1 USD 환율",
        "수집시각(UTC)",
        "데이터 출처",
      ],
      ...month.results.map((item) => [
        item.rate_date,
        item.currency,
        item.base_currency,
        formatNumber(item.rate, 8),
        item.collected_at,
        "Open Exchange Rates",
      ]),
    ];
    const csv = `\uFEFF${rows
      .map((row) => row.map((cell) => csvCell(cell)).join(","))
      .join("\r\n")}`;

    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="global-fx-daily-${fromValue}-to-${toDate}.csv"`,
        "Cache-Control": "no-store",
      },
    });
  }

  const requestedDate = url.searchParams.get("date");
  const safeDate =
    requestedDate && /^\d{4}-\d{2}-\d{2}$/.test(requestedDate)
      ? requestedDate
      : null;

  const selectedDate =
    safeDate ??
    (
      await DB.prepare(
        "SELECT MAX(rate_date) AS rate_date FROM daily_rates",
      ).first<{ rate_date: string | null }>()
    )?.rate_date;

  if (!selectedDate) {
    return Response.json(
      { error: "다운로드할 환율 데이터가 없습니다." },
      { status: 404 },
    );
  }

  const previousDate = (
    await DB.prepare(
      "SELECT MAX(rate_date) AS rate_date FROM daily_rates WHERE rate_date < ?",
    )
      .bind(selectedDate)
      .first<{ rate_date: string | null }>()
  )?.rate_date;

  const current = await DB.prepare(
    `SELECT currency, rate, base_currency, collected_at
     FROM daily_rates WHERE rate_date = ? ORDER BY currency`,
  )
    .bind(selectedDate)
    .all<RateRecord>();

  if (!current.results.length) {
    return Response.json(
      { error: `${selectedDate} 환율 데이터가 없습니다.` },
      { status: 404 },
    );
  }

  const previous = previousDate
    ? await DB.prepare(
        `SELECT currency, rate, base_currency, collected_at
         FROM daily_rates WHERE rate_date = ? ORDER BY currency`,
      )
        .bind(previousDate)
        .all<RateRecord>()
    : { results: [] };

  const previousMap = new Map(
    previous.results.map((item) => [item.currency, item.rate]),
  );
  const currentKrw = current.results.find((item) => item.currency === "KRW")?.rate;
  const previousKrw = previous.results.find((item) => item.currency === "KRW")?.rate;

  const rows = [
    [
      "기준일",
      "전일 기준일",
      "통화코드",
      "기준통화",
      "USD 기준 환율",
      "오늘 KRW 환율",
      "전일 KRW 환율",
      "변동액(KRW)",
      "변동률(%)",
      "수집시각(UTC)",
      "데이터 출처",
    ],
    ...current.results.map((item) => {
      const currentKrwValue =
        currentKrw && item.rate ? currentKrw / item.rate : null;
      const previousRate = previousMap.get(item.currency);
      const previousKrwValue =
        previousKrw && previousRate ? previousKrw / previousRate : null;
      const difference =
        currentKrwValue != null && previousKrwValue != null
          ? currentKrwValue - previousKrwValue
          : null;
      const change =
        difference != null && previousKrwValue
          ? (difference / previousKrwValue) * 100
          : null;

      return [
        selectedDate,
        previousDate ?? "",
        item.currency,
        item.base_currency,
        formatNumber(item.rate, 8),
        formatNumber(currentKrwValue, 6),
        formatNumber(previousKrwValue, 6),
        formatNumber(difference, 6),
        formatNumber(change, 4),
        item.collected_at,
        "Open Exchange Rates",
      ];
    }),
  ];

  const csv = `\uFEFF${rows
    .map((row) => row.map((cell) => csvCell(cell)).join(","))
    .join("\r\n")}`;

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="global-fx-daily-${selectedDate}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
