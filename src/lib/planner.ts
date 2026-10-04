import { localHHMM, localMinutes, SLOT_MS } from "./time";
import type { Appliance, Household, Mode, Slot, Window } from "./types";

const BAND_LABEL = { day: "day rate", night: "night rate", peak: "peak rate", boost: "EV boost rate" };

type Cand = { i: number; cost: number; co2: number; solarShare: number; estimated: boolean };

function evaluate(slots: Slot[], i: number, n: number, a: Appliance, kWp: number): Cand {
  let cost = 0, co2 = 0, solar = 0, total = 0, estimated = false;
  for (let k = i; k < i + n; k++) {
    const s = slots[k];
    const need = a.kW / 2; // kWh in a 30-minute slot
    const sun = Math.min(need, ((s.solarKW ?? 0) * kWp) / 2);
    const grid = need - sun;
    cost += grid * s.price;
    co2 += grid * (s.co2 ?? 250);
    solar += sun;
    total += need;
    estimated ||= s.co2Estimated;
  }
  return { i, cost, co2, solarShare: total ? solar / total : 0, estimated };
}

function usualIndex(slots: Slot[], usualStart: string): number {
  const [h, m] = usualStart.split(":").map(Number);
  const target = h * 60 + m;
  const idx = slots.findIndex((s) => Math.abs(localMinutes(new Date(s.start)) - target) < 15);
  return idx === -1 ? 0 : idx;
}

function reason(best: Cand, usual: Cand, slots: Slot[], n: number): string {
  const s = slots[best.i];
  void n;
  const parts: string[] = [];
  if (best.solarShare > 0.2) parts.push(`${Math.round(best.solarShare * 100)}% from your own panels`);
  parts.push(BAND_LABEL[s.band] + ` (€${s.price.toFixed(2)}/kWh)`);
  const windy = (s.windMW ?? 0) > 2000;
  if (windy) parts.push(`windy grid (${(s.windMW! / 1000).toFixed(1)} GW wind)`);
  if (usual.co2 > 0 && best.co2 < usual.co2 * 0.85) {
    parts.push(`${Math.round((1 - best.co2 / usual.co2) * 100)}% less CO2 than your usual time`);
  }
  return parts.join(" · ");
}

export function bestWindows(
  slots: Slot[],
  household: Household,
  mode: Mode,
  opts: { deadline?: string; applianceIds?: string[] } = {},
): Window[] {
  const future = slots.filter((s) => !s.past && s.co2 !== null);
  const kWp = household.solar?.kWp ?? 0;
  const deadline = opts.deadline ? Date.parse(opts.deadline) : Infinity;
  const apps = household.appliances.filter((a) => !opts.applianceIds || opts.applianceIds.includes(a.id));

  return apps.map((a) => {
    const n = Math.ceil(a.hours * 2);
    const cands: Cand[] = [];
    for (let i = 0; i + n <= future.length; i++) {
      const endT = Date.parse(future[i + n - 1].start) + SLOT_MS;
      if (endT > deadline) break;
      cands.push(evaluate(future, i, n, a, kWp));
    }
    if (!cands.length) cands.push(evaluate(future, 0, Math.min(n, future.length), a, kWp));
    const maxCost = Math.max(...cands.map((c) => c.cost), 0.0001);
    const maxCo2 = Math.max(...cands.map((c) => c.co2), 0.0001);
    const score = (c: Cand) =>
      mode === "cost" ? c.cost : mode === "carbon" ? c.co2 : 0.5 * (c.cost / maxCost) + 0.5 * (c.co2 / maxCo2);
    const best = cands.reduce((b, c) => (score(c) < score(b) ? c : b));
    const ui = Math.min(usualIndex(future, a.usualStart), Math.max(0, future.length - n));
    const usual = evaluate(future, ui, Math.min(n, future.length - ui), a, kWp);
    const start = future[best.i].start;
    const end = new Date(Date.parse(start) + n * SLOT_MS).toISOString();
    return {
      applianceId: a.id,
      start,
      end,
      costEUR: +best.cost.toFixed(2),
      co2g: Math.round(best.co2),
      usual: { start: future[ui].start, costEUR: +usual.cost.toFixed(2), co2g: Math.round(usual.co2) },
      savedEUR: +(usual.cost - best.cost).toFixed(2),
      savedCO2g: Math.round(usual.co2 - best.co2),
      usesEstimate: best.estimated,
      reason: reason(best, usual, future, n),
    };
  });
}

export const fmtWindow = (w: Window) =>
  `${localHHMM(new Date(w.start))}–${localHHMM(new Date(w.end))}`;
