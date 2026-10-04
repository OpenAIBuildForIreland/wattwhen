import { getHousehold } from "@/lib/households";
import { bestWindows } from "@/lib/planner";
import { buildTimeline } from "@/lib/timeline";
import type { Household, Mode } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = (await request.json()) as { householdId?: string; household?: Household; mode?: Mode };
  const h = body.household ?? getHousehold(body.householdId ?? "general");
  const mode = body.mode ?? "both";
  const timeline = await buildTimeline({ tariffId: h.tariffId, lat: h.lat, lon: h.lon });
  return Response.json({ mode, windows: bestWindows(timeline.slots, h, mode) });
}
