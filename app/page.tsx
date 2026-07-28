"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type RateRow = { currency: string; rate: number };
type HistoryRow = { rate_date: string; currency: string; rate: number };
type Snapshot = {
  latestDate: string | null;
  previousDate: string | null;
  latest: RateRow[];
  previous: RateRow[];
  history: HistoryRow[];
  stats: {
    days: number;
    currencies: number;
    first_date: string | null;
    last_date: string | null;
  };
  latestRun: { status: string; currency_count: number; created_at: string } | null;
  configured: boolean;
  syncNotice: string | null;
  error?: string;
};

const currencyMeta: Record<string, { name: string; flag: string }> = {
  AED: { name: "아랍에미리트 디르함", flag: "🇦🇪" },
  AUD: { name: "호주 달러", flag: "🇦🇺" },
  BRL: { name: "브라질 헤알", flag: "🇧🇷" },
  CAD: { name: "캐나다 달러", flag: "🇨🇦" },
  CHF: { name: "스위스 프랑", flag: "🇨🇭" },
  CNY: { name: "중국 위안", flag: "🇨🇳" },
  EUR: { name: "유로", flag: "🇪🇺" },
  GBP: { name: "영국 파운드", flag: "🇬🇧" },
  HKD: { name: "홍콩 달러", flag: "🇭🇰" },
  IDR: { name: "인도네시아 루피아", flag: "🇮🇩" },
  INR: { name: "인도 루피", flag: "🇮🇳" },
  JPY: { name: "일본 엔", flag: "🇯🇵" },
  KRW: { name: "대한민국 원", flag: "🇰🇷" },
  MXN: { name: "멕시코 페소", flag: "🇲🇽" },
  MYR: { name: "말레이시아 링깃", flag: "🇲🇾" },
  NZD: { name: "뉴질랜드 달러", flag: "🇳🇿" },
  PHP: { name: "필리핀 페소", flag: "🇵🇭" },
  SGD: { name: "싱가포르 달러", flag: "🇸🇬" },
  THB: { name: "태국 바트", flag: "🇹🇭" },
  TRY: { name: "튀르키예 리라", flag: "🇹🇷" },
  TWD: { name: "대만 달러", flag: "🇹🇼" },
  USD: { name: "미국 달러", flag: "🇺🇸" },
  VND: { name: "베트남 동", flag: "🇻🇳" },
  ZAR: { name: "남아공 랜드", flag: "🇿🇦" },
};

const highlights = ["KRW", "EUR", "JPY", "CNY"];

function formatRate(value: number) {
  if (!Number.isFinite(value)) return "—";
  if (value >= 1000) return value.toLocaleString("ko-KR", { maximumFractionDigits: 2 });
  if (value >= 1) return value.toLocaleString("ko-KR", { minimumFractionDigits: 2, maximumFractionDigits: 4 });
  return value.toLocaleString("ko-KR", { minimumFractionDigits: 4, maximumFractionDigits: 6 });
}

function convertedRate(rate: number, base: "USD" | "KRW", krwRate: number) {
  return base === "USD" ? rate : rate / krwRate;
}

export default function Home() {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [query, setQuery] = useState("");
  const [base, setBase] = useState<"USD" | "KRW">("KRW");
  const [days, setDays] = useState(30);
  const [selectedCurrency, setSelectedCurrency] = useState("USD");
  const [amount, setAmount] = useState("1000");
  const [fromCurrency, setFromCurrency] = useState("USD");
  const [toCurrency, setToCurrency] = useState("KRW");

  const loadRates = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/rates?days=${days}&currencies=KRW,EUR,JPY,CNY,GBP,AUD,CAD,USD`, {
        cache: "no-store",
      });
      setSnapshot((await response.json()) as Snapshot);
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    let active = true;
    fetch(`/api/rates?days=${days}&currencies=KRW,EUR,JPY,CNY,GBP,AUD,CAD,USD`, {
      cache: "no-store",
    })
      .then((response) => response.json() as Promise<Snapshot>)
      .then((data) => {
        if (active) setSnapshot(data);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [days]);

  const latestMap = useMemo(
    () => new Map(snapshot?.latest.map((item) => [item.currency, item.rate]) ?? []),
    [snapshot],
  );
  const previousMap = useMemo(
    () => new Map(snapshot?.previous.map((item) => [item.currency, item.rate]) ?? []),
    [snapshot],
  );
  const krwRate = latestMap.get("KRW") ?? 1;

  const rows = useMemo(() => {
    return (snapshot?.latest ?? [])
      .filter(({ currency }) => {
        const meta = currencyMeta[currency];
        const value = `${currency} ${meta?.name ?? ""}`.toLowerCase();
        return value.includes(query.trim().toLowerCase());
      })
      .map((item) => {
        const current = convertedRate(item.rate, base, krwRate);
        const previousRaw = previousMap.get(item.currency);
        const previousKrw = previousMap.get("KRW") ?? krwRate;
        const previous = previousRaw
          ? convertedRate(previousRaw, base, previousKrw)
          : null;
        const change = previous ? ((current - previous) / previous) * 100 : null;
        return { ...item, displayRate: current, change };
      });
  }, [snapshot, query, base, krwRate, previousMap]);

  const chartData = useMemo(() => {
    const grouped = new Map<string, { selected?: number; krw?: number }>();
    for (const item of snapshot?.history ?? []) {
      const current = grouped.get(item.rate_date) ?? {};
      if (item.currency === selectedCurrency) current.selected = item.rate;
      if (item.currency === "KRW") current.krw = item.rate;
      grouped.set(item.rate_date, current);
    }
    return [...grouped.entries()]
      .filter(([, value]) => value.selected && value.krw)
      .map(([date, value]) => ({
        date,
        value:
          selectedCurrency === "USD"
            ? value.krw!
            : value.krw! / value.selected!,
      }));
  }, [snapshot, selectedCurrency]);

  const chartBounds = useMemo(() => {
    const values = chartData.map((item) => item.value);
    return {
      min: values.length ? Math.min(...values) : 0,
      max: values.length ? Math.max(...values) : 1,
    };
  }, [chartData]);

  const availableCurrencies = snapshot?.latest.map((item) => item.currency) ?? [];
  const calculated = useMemo(() => {
    const numericAmount = Number(amount.replaceAll(",", ""));
    const fromRate = latestMap.get(fromCurrency);
    const toRate = latestMap.get(toCurrency);
    if (!Number.isFinite(numericAmount) || !fromRate || !toRate) return null;
    return (numericAmount / fromRate) * toRate;
  }, [amount, fromCurrency, toCurrency, latestMap]);

  async function forceSync() {
    setSyncing(true);
    try {
      await fetch("/api/rates/sync", { method: "POST" });
      await loadRates();
    } finally {
      setSyncing(false);
    }
  }

  return (
    <main>
      <header className="topbar">
        <a className="brand" href="#top" aria-label="Global FX Daily 홈">
          <span className="brandMark">G</span>
          <span>Global FX <b>Daily</b></span>
        </a>
        <nav aria-label="주요 메뉴">
          <a className="active" href="#dashboard">대시보드</a>
          <a href="#currencies">통화</a>
          <a href="#calculator">계산기</a>
        </nav>
        <button className="syncButton" onClick={forceSync} disabled={syncing}>
          <span className={syncing ? "spin" : ""}>↻</span>
          {syncing ? "동기화 중" : "오늘 환율 동기화"}
        </button>
      </header>

      <section className="hero" id="top">
        <div>
          <div className="eyebrow"><span /> DAILY CURRENCY INTELLIGENCE</div>
          <h1>오늘의 환율을 읽고,<br /><em>내일의 흐름</em>을 준비하세요.</h1>
          <p>전 세계 통화의 일별 환율을 한곳에 쌓고 비교합니다.<br />Open Exchange Rates 기반, 매일 자동 업데이트.</p>
        </div>
        <div className="heroOrb" aria-hidden="true">
          <div className="orbit orbitOne"><i>€</i></div>
          <div className="orbit orbitTwo"><i>¥</i></div>
          <div className="orbCenter"><small>기준 통화</small><strong>KRW</strong><span>대한민국 원</span></div>
          <span className="orbitLabel labelOne">$</span>
          <span className="orbitLabel labelTwo">£</span>
        </div>
      </section>

      {!snapshot?.configured && (
        <aside className="notice">
          <strong>데이터 연결 준비 완료</strong>
          <span>Open Exchange Rates API 키를 서버에 등록하면 오늘부터 일별 데이터가 자동 누적됩니다.</span>
        </aside>
      )}

      <section className="dashboard" id="dashboard">
        <div className="sectionHeading">
          <div>
            <span className="sectionNumber">01</span>
            <h2>오늘의 주요 환율</h2>
            <p>{snapshot?.latestDate ? `${snapshot.latestDate} · UTC 종가 기준` : "첫 데이터 동기화를 기다리고 있습니다."}</p>
          </div>
          <div className="baseToggle" aria-label="기준 통화 선택">
            <span>기준</span>
            <button className={base === "KRW" ? "selected" : ""} onClick={() => setBase("KRW")}>KRW</button>
            <button className={base === "USD" ? "selected" : ""} onClick={() => setBase("USD")}>USD</button>
          </div>
        </div>

        <div className="rateCards">
          {highlights.map((currency) => {
            const raw = latestMap.get(currency);
            const previousRaw = previousMap.get(currency);
            const current = raw ? convertedRate(raw, base, krwRate) : null;
            const previousKrw = previousMap.get("KRW") ?? krwRate;
            const previous = previousRaw ? convertedRate(previousRaw, base, previousKrw) : null;
            const change = current && previous ? ((current - previous) / previous) * 100 : null;
            const meta = currencyMeta[currency];
            return (
              <article className="rateCard" key={currency}>
                <div className="currencyTitle">
                  <span className="flag">{meta.flag}</span>
                  <div><strong>{currency}</strong><small>{meta.name}</small></div>
                </div>
                <div className="rateValue">{current ? formatRate(current) : "—"}</div>
                <div className="rateMeta">
                  <span>1 {base} 기준</span>
                  <span className={change == null ? "neutral" : change >= 0 ? "up" : "down"}>
                    {change == null ? "신규" : `${change >= 0 ? "▲" : "▼"} ${Math.abs(change).toFixed(2)}%`}
                  </span>
                </div>
              </article>
            );
          })}
        </div>

        <div className="insightGrid">
          <article className="panel chartPanel">
            <div className="panelHeading">
              <div>
                <span className="sectionNumber">02</span>
                <h2>KRW 환율 흐름</h2>
              </div>
              <div className="filters">
                <select value={selectedCurrency} onChange={(event) => setSelectedCurrency(event.target.value)} aria-label="차트 통화">
                  {["USD", "EUR", "JPY", "CNY", "GBP", "AUD", "CAD"].map((currency) => (
                    <option value={currency} key={currency}>{currency} / KRW</option>
                  ))}
                </select>
                <select value={days} onChange={(event) => setDays(Number(event.target.value))} aria-label="조회 기간">
                  <option value={7}>7일</option>
                  <option value={30}>30일</option>
                  <option value={90}>90일</option>
                  <option value={365}>1년</option>
                </select>
              </div>
            </div>
            {chartData.length ? (
              <>
                <div className="chartSummary">
                  <strong>{formatRate(chartData.at(-1)?.value ?? 0)} 원</strong>
                  <span>{chartData.length}일 누적 데이터</span>
                </div>
                <div className="barChart" aria-label={`${selectedCurrency} 원화 환율 차트`}>
                  {chartData.map((item) => {
                    const range = chartBounds.max - chartBounds.min || 1;
                    const height = 28 + ((item.value - chartBounds.min) / range) * 72;
                    return <i key={item.date} style={{ height: `${height}%` }} title={`${item.date}: ${formatRate(item.value)}원`} />;
                  })}
                </div>
                <div className="chartAxis"><span>{chartData[0]?.date}</span><span>{chartData.at(-1)?.date}</span></div>
              </>
            ) : (
              <div className="emptyChart">
                <span>↗</span>
                <strong>일별 데이터가 쌓이면 추세가 나타납니다</strong>
                <p>첫 동기화 후 매일 같은 시간에 새로운 환율이 추가됩니다.</p>
              </div>
            )}
          </article>

          <article className="panel calculator" id="calculator">
            <span className="sectionNumber">03</span>
            <h2>빠른 환율 계산기</h2>
            <p>저장된 최신 환율로 바로 계산하세요.</p>
            <label>
              보내는 금액
              <div className="moneyInput">
                <input value={amount} onChange={(event) => setAmount(event.target.value)} inputMode="decimal" aria-label="보내는 금액" />
                <select value={fromCurrency} onChange={(event) => setFromCurrency(event.target.value)} aria-label="보내는 통화">
                  {availableCurrencies.map((currency) => <option key={currency}>{currency}</option>)}
                </select>
              </div>
            </label>
            <button
              className="swap"
              onClick={() => {
                setFromCurrency(toCurrency);
                setToCurrency(fromCurrency);
              }}
              aria-label="통화 순서 바꾸기"
            >⇅</button>
            <label>
              받는 금액
              <div className="moneyInput resultInput">
                <output>{calculated == null ? "—" : formatRate(calculated)}</output>
                <select value={toCurrency} onChange={(event) => setToCurrency(event.target.value)} aria-label="받는 통화">
                  {availableCurrencies.map((currency) => <option key={currency}>{currency}</option>)}
                </select>
              </div>
            </label>
            <small className="calculatorNote">수수료가 포함되지 않은 참고 환율입니다.</small>
          </article>
        </div>
      </section>

      <section className="currencySection" id="currencies">
        <div className="sectionHeading">
          <div>
            <span className="sectionNumber">04</span>
            <h2>전 세계 통화</h2>
            <p>저장된 모든 통화를 검색하고 전일 대비 변화를 확인하세요.</p>
          </div>
          <label className="search">
            <span>⌕</span>
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="통화명 또는 코드 검색" aria-label="통화 검색" />
          </label>
        </div>
        <div className="tableWrap">
          <table>
            <thead>
              <tr><th>통화</th><th>코드</th><th>1 {base} 환율</th><th>전일 대비</th><th>기준일</th></tr>
            </thead>
            <tbody>
              {rows.slice(0, 40).map((row) => {
                const meta = currencyMeta[row.currency] ?? { flag: "◉", name: "글로벌 통화" };
                return (
                  <tr key={row.currency}>
                    <td><span className="tableFlag">{meta.flag}</span><strong>{meta.name}</strong></td>
                    <td><code>{row.currency}</code></td>
                    <td>{formatRate(row.displayRate)}</td>
                    <td className={row.change == null ? "neutral" : row.change >= 0 ? "up" : "down"}>
                      {row.change == null ? "신규" : `${row.change >= 0 ? "+" : ""}${row.change.toFixed(2)}%`}
                    </td>
                    <td>{snapshot?.latestDate ?? "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!loading && rows.length === 0 && (
            <div className="emptyTable">
              <strong>{query ? "검색 결과가 없습니다." : "첫 환율 데이터를 기다리고 있습니다."}</strong>
              <span>{query ? "다른 통화명이나 코드를 입력해보세요." : "API 연결 후 ‘오늘 환율 동기화’를 눌러주세요."}</span>
            </div>
          )}
          {loading && <div className="loadingLine" />}
        </div>
      </section>

      <section className="archive">
        <div>
          <span className="archiveIcon">▦</span>
          <div><strong>{snapshot?.stats.days ?? 0}일</strong><small>누적 기준일</small></div>
          <div><strong>{snapshot?.stats.currencies ?? 0}개</strong><small>수집 통화</small></div>
          <div><strong>{snapshot?.stats.first_date ?? "수집 예정"}</strong><small>최초 저장일</small></div>
        </div>
        <p>매일 한 번만 저장하는 중복 방지 구조로<br />신뢰할 수 있는 환율 아카이브를 만듭니다.</p>
      </section>

      <footer>
        <div className="brand"><span className="brandMark">G</span><span>Global FX <b>Daily</b></span></div>
        <p>환율 데이터 제공: Open Exchange Rates · UTC 일별 기준</p>
        <span>© 2026 Global FX Daily</span>
      </footer>
    </main>
  );
}
