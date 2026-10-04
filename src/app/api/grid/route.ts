import { getGrid } from "@/lib/grid";
import { households } from "@/lib/households";
export async function GET(request: Request) {
  const p = new URL(request.url).searchParams;
  const household =
    households.find((h) => h.id === p.get("household")) ?? households[0];
  return Response.json(await getGrid(household, p.get("sample") === "1"));
}
