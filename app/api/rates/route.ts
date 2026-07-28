import { getRatesSnapshot } from "../../../lib/rates";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const days = Number(url.searchParams.get("days") ?? "30");
  const currencies = (url.searchParams.get("currencies") ?? "KRW,EUR,JPY,CNY,GBP,AUD,CAD")
    .toUpperCase()
    .split(",")
    .map((value) => value.trim());

  try {
    const snapshot = await getRatesSnapshot(days, currencies);
    return Response.json({ ...snapshot, configured: true, syncNotice: null });
  } catch (error) {
    return Response.json(
      {
        error: error instanceof Error ? error.message : "환율 데이터를 불러오지 못했습니다.",
        configured: true,
        syncNotice: null,
      },
      { status: 500 },
    );
  }
}
