import { getHousehold } from "@/lib/households";
import { solarYear } from "@/lib/solarYear";
import type { Household } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = (await request.json()) as { householdId?: string; household?: Household };
  const h = body.household ?? getHousehold(body.householdId ?? "solar");
  return Response.json(await solarYear(h));
}
