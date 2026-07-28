import { RatesConfigurationError, getRatesSnapshot, syncLatestRates } from "../../../lib/rates";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const days = Number(url.searchParams.get("days") ?? "30");
  const currencies = (url.searchParams.get("currencies") ?? "KRW,EUR,JPY,CNY,GBP,AUD,CAD")
    .toUpperCase()
    .split(",")
    .map((value) => value.trim());

  let syncNotice: string | null = null;
  let configured = true;
  try {
    await syncLatestRates(false);
  } catch (error) {
    configured = !(error instanceof RatesConfigurationError);
    syncNotice = error instanceof Error ? error.message : "오늘의 환율을 동기화하지 못했습니다.";
  }

  try {
    const snapshot = await getRatesSnapshot(days, currencies);
    return Response.json({ ...snapshot, configured, syncNotice });
  } catch (error) {
    return Response.json(
      {
        error: error instanceof Error ? error.message : "환율 데이터를 불러오지 못했습니다.",
        configured,
        syncNotice,
      },
      { status: 500 },
    );
  }
}
