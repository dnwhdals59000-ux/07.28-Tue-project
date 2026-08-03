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

const currencyRegions: Record<string, string> = {
  AED: "AE", AFN: "AF", ALL: "AL", AMD: "AM", ANG: "CW", AOA: "AO", ARS: "AR", AUD: "AU", AWG: "AW", AZN: "AZ",
  BAM: "BA", BBD: "BB", BDT: "BD", BGN: "BG", BHD: "BH", BIF: "BI", BMD: "BM", BND: "BN", BOB: "BO", BSD: "BS",
  BTN: "BT", BWP: "BW", BYN: "BY", BZD: "BZ", CAD: "CA", CDF: "CD", CHF: "CH", CLP: "CL", CNY: "CN", COP: "CO",
  CRC: "CR", CUC: "CU", CUP: "CU", CVE: "CV", CZK: "CZ", DJF: "DJ", DKK: "DK", DOP: "DO", DZD: "DZ", EGP: "EG",
  ERN: "ER", ETB: "ET", EUR: "EU", FJD: "FJ", FKP: "FK", GBP: "GB", GEL: "GE", GHS: "GH", GIP: "GI", GMD: "GM",
  GNF: "GN", GTQ: "GT", GYD: "GY", HKD: "HK", HNL: "HN", HRK: "HR", HTG: "HT", HUF: "HU", IDR: "ID", ILS: "IL",
  INR: "IN", IQD: "IQ", IRR: "IR", ISK: "IS", JMD: "JM", JOD: "JO", JPY: "JP", KES: "KE", KGS: "KG", KHR: "KH",
  KMF: "KM", KPW: "KP", KRW: "KR", KWD: "KW", KYD: "KY", KZT: "KZ", LAK: "LA", LBP: "LB", LKR: "LK", LRD: "LR",
  LSL: "LS", LYD: "LY", MAD: "MA", MDL: "MD", MGA: "MG", MKD: "MK", MMK: "MM", MNT: "MN", MOP: "MO", MRU: "MR",
  MUR: "MU", MVR: "MV", MWK: "MW", MXN: "MX", MYR: "MY", MZN: "MZ", NAD: "NA", NGN: "NG", NIO: "NI", NOK: "NO",
  NPR: "NP", NZD: "NZ", OMR: "OM", PAB: "PA", PEN: "PE", PGK: "PG", PHP: "PH", PKR: "PK", PLN: "PL", PYG: "PY",
  QAR: "QA", RON: "RO", RSD: "RS", RUB: "RU", RWF: "RW", SAR: "SA", SBD: "SB", SCR: "SC", SDG: "SD", SEK: "SE",
  SGD: "SG", SHP: "SH", SLE: "SL", SLL: "SL", SOS: "SO", SRD: "SR", SSP: "SS", STN: "ST", SVC: "SV", SYP: "SY",
  SZL: "SZ", THB: "TH", TJS: "TJ", TMT: "TM", TND: "TN", TOP: "TO", TRY: "TR", TTD: "TT", TWD: "TW", TZS: "TZ",
  UAH: "UA", UGX: "UG", USD: "US", UYU: "UY", UZS: "UZ", VES: "VE", VND: "VN", VUV: "VU", WST: "WS", XAF: "CM",
  XCD: "AG", XOF: "SN", XPF: "PF", YER: "YE", ZAR: "ZA", ZMW: "ZM", ZWG: "ZW", ZWL: "ZW",
};

const specialCurrencyNames: Record<string, string> = {
  BTC: "비트코인", CNH: "중국 위안(역외)", CLF: "칠레 환산 단위", XAG: "은", XAU: "금", XPD: "팔라듐", XPT: "백금",
};

function flagFromRegion(region: string | undefined) {
  if (!region || region === "EU") return region === "EU" ? "🇪🇺" : "🌐";
  return [...region.toUpperCase()].map((letter) => String.fromCodePoint(127397 + letter.charCodeAt(0))).join("");
}

function getCurrencyMeta(currency: string) {
  const known = currencyMeta[currency];
  if (known) return known;
  const displayName = specialCurrencyNames[currency] ?? new Intl.DisplayNames(["ko-KR"], { type: "currency" }).of(currency);
  return { name: displayName && displayName !== currency ? displayName : `${currency} 통화`, flag: flagFromRegion(currencyRegions[currency]) };
}

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
  const [base, setBase] = useState<"USD" | "KRW">("USD");
  const [days, setDays] = useState(30);
  const [selectedCurrency, setSelectedCurrency] = useState("USD");
  const [amount, setAmount] = useState("1000");
  const [fromCurrency, setFromCurrency] = useState("USD");
  const [toCurrency, setToCurrency] = useState("KRW");
  const [rangeFrom, setRangeFrom] = useState("");
  const [rangeTo, setRangeTo] = useState("");
  const [rangeApplied, setRangeApplied] = useState(true);
  const [rangeError, setRangeError] = useState("");

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
        const meta = getCurrencyMeta(currency);
        const value = `${currency} ${meta?.name ?? ""}`.toLowerCase();
        return value.includes(query.trim().toLowerCase());
      })
      .map((item) => {
        // The full currency table is always normalized to the API's USD base.
        const current = item.rate;
        const previousRaw = previousMap.get(item.currency);
        const previous = previousRaw ?? null;
        const change = previous ? ((current - previous) / previous) * 100 : null;
        return { ...item, displayRate: current, change };
      });
  }, [snapshot, query, previousMap]);

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
  const selectedRangeFrom = rangeFrom || snapshot?.stats.first_date || "";
  const selectedRangeTo = rangeTo || snapshot?.stats.last_date || "";

  function updateRange(setter: (value: string) => void, value: string) {
    setter(value);
    setRangeApplied(false);
    setRangeError("");
  }

  function applyRange() {
    if (!selectedRangeFrom || !selectedRangeTo || selectedRangeFrom > selectedRangeTo) {
      setRangeError("시작일과 종료일을 올바르게 선택해주세요.");
      setRangeApplied(false);
      return;
    }
    const start = Date.parse(`${selectedRangeFrom}T00:00:00Z`);
    const end = Date.parse(`${selectedRangeTo}T00:00:00Z`);
    if (end - start > 30 * 24 * 60 * 60 * 1000) {
      setRangeError("다운로드 범위는 최대 1개월까지 선택할 수 있습니다.");
      setRangeApplied(false);
      return;
    }
    setRangeError("");
    setRangeApplied(true);
  }
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
          {syncing ? "동기화 중" : "당일 환율 동기화"}
        </button>
      </header>

      <section className="hero" id="top">
        <div>
          <div className="eyebrow"><span /> DAILY CURRENCY INTELLIGENCE</div>
          <h1>오늘의 환율을 읽고,<br /><em>내일의 흐름</em>을 준비하세요.</h1>
          <p>전 세계 통화의 일별 환율을 한곳에 쌓고 비교합니다.<br />Open Exchange Rates 기반, 매일 오전 9시 5분 자동 업데이트.</p>
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
            const meta = getCurrencyMeta(currency);
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
          <div className="currencyActions">
            <label className="search">
              <span>⌕</span>
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="통화명 또는 코드 검색" aria-label="통화 검색" />
            </label>
            <div className="downloadControls">
              <label className="rangeLabel">
                <span>다운로드 기준일</span>
                <div className="rangeInputs">
                  <input
                    type="date"
                    value={selectedRangeFrom}
                    min={snapshot?.stats.first_date ?? undefined}
                    max={selectedRangeTo || snapshot?.stats.last_date || undefined}
                    onChange={(event) => updateRange(setRangeFrom, event.target.value)}
                    aria-label="다운로드 시작일"
                  />
                  <span>~</span>
                  <input
                    type="date"
                    value={selectedRangeTo}
                    min={selectedRangeFrom || snapshot?.stats.first_date || undefined}
                    max={snapshot?.stats.last_date ?? undefined}
                    onChange={(event) => updateRange(setRangeTo, event.target.value)}
                    aria-label="다운로드 종료일"
                  />
                </div>
              </label>
              <a
                className={`excelButton${rangeApplied && selectedRangeFrom && selectedRangeTo ? "" : " disabled"}`}
                href={rangeApplied && selectedRangeFrom && selectedRangeTo
                  ? `/api/rates/export?range=custom&from=${selectedRangeFrom}&to=${selectedRangeTo}`
                  : "#currencies"}
                download
                aria-disabled={!rangeApplied || !selectedRangeFrom || !selectedRangeTo}
                title="선택한 기간의 누적 환율 다운로드"
              >
                <span>↓</span>
                엑셀 다운로드
              </a>
              <button className="queryButton" type="button" onClick={applyRange}>조회</button>
            </div>
            {rangeError && <p className="rangeError" role="alert">{rangeError}</p>}
          </div>
        </div>
        <div className="tableWrap">
          <table>
            <thead>
              <tr><th>통화</th><th>코드</th><th>1 USD 환율</th><th>전일 대비</th><th>기준일</th></tr>
            </thead>
            <tbody>
              {rows.slice(0, 40).map((row) => {
                const meta = getCurrencyMeta(row.currency);
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
              <span>{query ? "다른 통화명이나 코드를 입력해보세요." : "오전 9시 5분 이후 ‘당일 환율 동기화’를 눌러주세요."}</span>
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
        <p>환율 데이터 제공: <a className="sourceLink" href="https://openexchangerates.org/" target="_blank" rel="noreferrer">Open Exchange Rates</a> · UTC 일별 기준</p>
        <span>© 2026 Global FX Daily</span>
      </footer>
    </main>
  );
}
