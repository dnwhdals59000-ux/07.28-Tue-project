import { RatesConfigurationError, syncLatestRates } from "../../../../lib/rates";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const result = await syncLatestRates(true);
    return Response.json(result);
  } catch (error) {
    return Response.json(
      {
        error: error instanceof Error ? error.message : "환율 동기화에 실패했습니다.",
      },
      { status: error instanceof RatesConfigurationError ? 503 : 502 },
    );
  }
}
