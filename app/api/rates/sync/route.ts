import {
  RatesConfigurationError,
  RatesTooEarlyError,
  syncLatestRates,
} from "../../../../lib/rates";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const url = new URL(request.url);
    const source =
      url.searchParams.get("source") === "scheduled" ? "scheduled" : "manual";
    const result = await syncLatestRates(source);
    return Response.json(result);
  } catch (error) {
    return Response.json(
      {
        error: error instanceof Error ? error.message : "환율 동기화에 실패했습니다.",
      },
      {
        status:
          error instanceof RatesTooEarlyError
            ? 409
            : error instanceof RatesConfigurationError
              ? 503
              : 502,
      },
    );
  }
}
