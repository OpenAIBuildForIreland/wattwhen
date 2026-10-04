import Anthropic from "@anthropic-ai/sdk";
import { bestWindows } from "./planner";
import { solarYear } from "./solarYear";
import { getTariff } from "./tariffs";
import { localHHMM } from "./time";
import { buildTimeline } from "./timeline";
import type { Appliance, Household, Mode, Timeline, Window } from "./types";

export const MODEL = process.env.ANTHROPIC_MODEL || "claude-haiku-4-5";
let _client: Anthropic | null = null;
const client = () => (_client ??= new Anthropic());

const fmtDay = new Intl.DateTimeFormat("en-IE", { timeZone: "Europe/Dublin", weekday: "short" });
const label = (iso: string) => `${fmtDay.format(new Date(iso))} ${localHHMM(new Date(iso))}`;

const SYSTEM = `You are WattWhen, an assistant that helps Irish households decide when to use, store and sell electricity.

How to answer:
- Always use the tools for numbers. Never calculate € or CO2 yourself; quote the tool results.
- Times are Irish local time. Say "tonight", "tomorrow 03:00" and so on.
- Keep answers short: 2 to 4 sentences, plain language, no markdown headings.
- Grid CO2 for future hours is WattWhen's own estimate from EirGrid's wind forecast. Say "estimated" when you quote it.
- Tariff rates are sample rates until real supplier prices are added. Mention this if the user asks about exact costs.
- Households are synthetic profiles. Never claim to know the user's real usage.
- If a request needs a load that isn't in the household (for example "charge the car to 80%"), call best_window with kW and hours you work out from what they said. An EV charger is usually 7.2 kW; a 60 kWh battery from 20% to 80% is 36 kWh, about 5 hours.`;

const tools: Anthropic.Tool[] = [
  {
    name: "get_grid_outlook",
    description:
      "Hourly outlook for the next ~36 hours: grid CO2 intensity (gCO2/kWh, actual or estimated), wind forecast (MW), tariff band and import price, and the household's solar output if it has panels. Use it to answer 'when is the grid cleanest/cheapest'.",
    input_schema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "best_window",
    description:
      "Find the best time to run a load in the next ~36 hours, scored on cost, carbon or both. Use appliance_id for a household appliance, or give name, kW and hours for a custom load. Optional deadline (ISO 8601 with offset) means the load must finish by then.",
    input_schema: {
      type: "object",
      properties: {
        appliance_id: { type: "string", description: "One of the household's appliance ids" },
        name: { type: "string", description: "Name for a custom load" },
        kW: { type: "number", description: "Power draw in kW for a custom load" },
        hours: { type: "number", description: "Run time in hours for a custom load" },
        deadline: { type: "string", description: "ISO 8601 time the load must finish by" },
        mode: { type: "string", enum: ["cost", "carbon", "both"] },
      },
      additionalProperties: false,
    },
  },
  {
    name: "solar_year",
    description:
      "Month-by-month solar projection for the household (or a 4 kWp south-facing system if it has none): generation, export, bill after export credit, and annual totals vs no solar.",
    input_schema: { type: "object", properties: {}, additionalProperties: false },
  },
];

type ToolInput = {
  appliance_id?: string;
  name?: string;
  kW?: number;
  hours?: number;
  deadline?: string;
  mode?: Mode;
};

async function runTool(
  name: string,
  input: ToolInput,
  ctx: { household: Household; mode: Mode; timeline: Timeline; windows: Window[] },
): Promise<string> {
  const { household, timeline } = ctx;
  if (name === "get_grid_outlook") {
    const hourly = timeline.slots
      .filter((s) => !s.past && new Date(s.start).getUTCMinutes() === 0)
      .map((s) => ({
        time: label(s.start),
        co2: s.co2,
        co2_estimated: s.co2Estimated,
        wind_MW: s.windMW,
        band: s.band,
        price_eur_kwh: s.price,
        ...(household.solar ? { solar_kW: +((s.solarKW ?? 0) * household.solar.kWp).toFixed(2) } : {}),
      }));
    return JSON.stringify({ tariff: getTariff(household.tariffId).plan, hourly });
  }
  if (name === "best_window") {
    let h = household;
    let ids: string[] | undefined;
    if (input.appliance_id && household.appliances.some((a) => a.id === input.appliance_id)) {
      ids = [input.appliance_id];
    } else {
      if (!input.kW || !input.hours) return JSON.stringify({ error: "Give appliance_id, or kW and hours for a custom load." });
      const custom: Appliance = {
        id: "custom",
        name: input.name ?? "Custom load",
        kW: input.kW,
        hours: input.hours,
        usualStart: "18:30",
        kind: /car|ev/i.test(input.name ?? "") ? "ev" : "immersion",
      };
      h = { ...household, appliances: [custom] };
      ids = ["custom"];
    }
    const [w] = bestWindows(timeline.slots, h, input.mode ?? ctx.mode, { deadline: input.deadline, applianceIds: ids });
    if (!w) return JSON.stringify({ error: "No window fits before that deadline." });
    ctx.windows.push(w);
    return JSON.stringify({
      load: h.appliances.find((a) => a.id === w.applianceId)?.name,
      start: label(w.start),
      end: label(w.end),
      cost_eur: w.costEUR,
      co2_g: w.co2g,
      usual_start: label(w.usual.start),
      saved_eur_vs_usual: w.savedEUR,
      saved_co2_g_vs_usual: w.savedCO2g,
      uses_estimated_co2: w.usesEstimate,
      why: w.reason,
    });
  }
  if (name === "solar_year") {
    const y = await solarYear({ ...household, solar: household.solar ?? { kWp: 4, aspect: 0, tilt: 35 } });
    return JSON.stringify({
      totals: y.totals,
      months: y.months.map((m) => ({ month: m.month, gen_kWh: m.genKWh, export_kWh: m.exportKWh, net_bill_eur: m.netEUR })),
      assumptions: y.assumptions,
    });
  }
  return JSON.stringify({ error: `Unknown tool ${name}` });
}

export async function ask(
  history: { role: "user" | "assistant"; content: string }[],
  household: Household,
  mode: Mode,
) {
  const timeline = await buildTimeline({ tariffId: household.tariffId, lat: household.lat, lon: household.lon });
  const ctx = { household, mode, timeline, windows: [] as Window[] };
  const now = new Date();
  const context = `Context (from WattWhen, not the user): it is now ${label(now.toISOString())} Irish time (${now.toISOString()} UTC). Household: ${household.name}, ${household.county}; appliances: ${household.appliances
    .map((a) => `${a.id} (${a.name}, ${a.kW} kW, ${a.hours} h)`)
    .join(", ")}${household.ev ? "; has an EV" : ""}${household.solar ? `; ${household.solar.kWp} kWp solar` : ""}${
    household.battery ? `; ${household.battery.kWh} kWh battery` : ""
  }. Optimising for: ${mode}.`;

  const messages: Anthropic.MessageParam[] = history.map((m, i) =>
    i === history.length - 1 && m.role === "user" ? { role: "user", content: `${context}\n\n${m.content}` } : m,
  );
  const toolsUsed: string[] = [];

  for (let step = 0; step < 6; step++) {
    const response = await client().messages.create({
      model: MODEL,
      max_tokens: 16000,
      system: SYSTEM,
      tools,
      messages,
    });
    if (response.stop_reason !== "tool_use") {
      const text = response.content
        .filter((b): b is Anthropic.TextBlock => b.type === "text")
        .map((b) => b.text)
        .join("\n")
        .trim();
      return { text, toolsUsed, windows: ctx.windows, model: MODEL };
    }
    messages.push({ role: "assistant", content: response.content });
    const results: Anthropic.ToolResultBlockParam[] = [];
    for (const block of response.content) {
      if (block.type !== "tool_use") continue;
      toolsUsed.push(block.name);
      try {
        results.push({ type: "tool_result", tool_use_id: block.id, content: await runTool(block.name, block.input as ToolInput, ctx) });
      } catch (e) {
        results.push({ type: "tool_result", tool_use_id: block.id, content: String(e), is_error: true });
      }
    }
    messages.push({ role: "user", content: results });
  }
  return { text: "Sorry, that took too many steps. Try asking more simply.", toolsUsed, windows: ctx.windows, model: MODEL };
}

export type BillFields = {
  supplier: string | null;
  plan: string | null;
  billing_period: string | null;
  day_rate_eur_kwh: number | null;
  night_rate_eur_kwh: number | null;
  peak_rate_eur_kwh: number | null;
  standing_charge_eur_day: number | null;
  export_rate_eur_kwh: number | null;
  kwh_used: number | null;
  total_eur: number | null;
};

const BILL_TOOL: Anthropic.Tool = {
  name: "record_bill",
  description: "Record the tariff and usage fields read from an Irish electricity bill. Use null for anything not shown.",
  input_schema: {
    type: "object",
    properties: {
      supplier: { type: ["string", "null"] },
      plan: { type: ["string", "null"] },
      billing_period: { type: ["string", "null"] },
      day_rate_eur_kwh: { type: ["number", "null"], description: "Unit rate in € per kWh incl. VAT if shown" },
      night_rate_eur_kwh: { type: ["number", "null"] },
      peak_rate_eur_kwh: { type: ["number", "null"] },
      standing_charge_eur_day: { type: ["number", "null"] },
      export_rate_eur_kwh: { type: ["number", "null"] },
      kwh_used: { type: ["number", "null"] },
      total_eur: { type: ["number", "null"] },
    },
    required: [
      "supplier",
      "plan",
      "billing_period",
      "day_rate_eur_kwh",
      "night_rate_eur_kwh",
      "peak_rate_eur_kwh",
      "standing_charge_eur_day",
      "export_rate_eur_kwh",
      "kwh_used",
      "total_eur",
    ],
  },
};

export async function readBill(base64: string, mediaType: "image/jpeg" | "image/png" | "image/webp" | "image/gif") {
  const response = await client().messages.create({
    model: MODEL,
    max_tokens: 2048,
    tools: [BILL_TOOL],
    tool_choice: { type: "tool", name: "record_bill" },
    messages: [
      {
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: mediaType, data: base64 } },
          {
            type: "text",
            text: "Read this electricity bill and record the tariff and usage fields. Ignore names, addresses, account numbers and MPRNs: never include personal details.",
          },
        ],
      },
    ],
  });
  const block = response.content.find((b): b is Anthropic.ToolUseBlock => b.type === "tool_use");
  return { fields: (block?.input ?? null) as BillFields | null, model: MODEL };
}
