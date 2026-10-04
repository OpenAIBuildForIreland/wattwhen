import { getGrid } from "@/lib/grid";
import { readHousehold } from "@/lib/households";
import { bestWindow } from "@/lib/planner";
export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!["cost", "carbon", "both"].includes(body.mode))
      throw new Error("Choose cost, carbon or both");
    const household = readHousehold(body.household),
      grid = await getGrid(household, body.sample === true);
    return Response.json({
      grid,
      windows: household.appliances
        .map((a) => bestWindow(grid.slots, a, body.mode, body.deadline))
        .filter(Boolean),
      note: "Each appliance is optimised independently. Solar savings are not additive across overlapping windows; no battery dispatch is modelled.",
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Invalid request" },
      { status: 400 },
    );
  }
}
