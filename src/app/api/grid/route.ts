import { getHousehold } from "@/lib/households";
import { buildTimeline } from "@/lib/timeline";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const h = getHousehold(searchParams.get("household") ?? "default");
  const timeline = await buildTimeline({ tariffId: searchParams.get("tariff") ?? h.tariffId, lat: h.lat, lon: h.lon });
  return Response.json(timeline);
}
