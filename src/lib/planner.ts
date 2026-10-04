import { HALF_HOUR, timeLabel } from "./time";
import type { Appliance, Mode, Slot, Window } from "./types";
export function bestWindow(
  slots: Slot[],
  appliance: Appliance,
  mode: Mode,
  deadline?: string,
): Window | null {
  const count = Math.ceil(appliance.hours * 2);
  const candidates: {
    start: string;
    end: string;
    costEUR: number;
    co2g: number;
    solar: number;
    night: number;
  }[] = [];
  const limit = deadline ? Date.parse(deadline) : Infinity;
  if (Number.isNaN(limit)) throw new Error("Invalid deadline");
  for (let i = 0; i <= slots.length - count; i++) {
    const part = slots.slice(i, i + count),
      end = new Date(Date.parse(part.at(-1)!.start) + HALF_HOUR).toISOString();
    if (Date.parse(end) > limit) continue;
    if (
      part.some(
        (s, j) =>
          j > 0 &&
          Date.parse(s.start) - Date.parse(part[j - 1].start) !== HALF_HOUR,
      )
    )
      continue;
    let costEUR = 0,
      co2g = 0,
      solar = 0;
    part.forEach((s, j) => {
      const hours = Math.min(0.5, appliance.hours - j * 0.5);
      const demand = appliance.kW * hours;
      const used = Math.min(demand, (s.solarKW ?? 0) * hours);
      const imported = demand - used;
      costEUR += imported * s.price;
      co2g += imported * s.co2;
      solar += used;
    });
    candidates.push({
      start: part[0].start,
      end,
      costEUR,
      co2g,
      solar,
      night: part.filter((s) => s.band === "night").length,
    });
  }
  if (!candidates.length) return null;
  const maxCost = Math.max(...candidates.map((c) => c.costEUR), 0.0001),
    maxCO2 = Math.max(...candidates.map((c) => c.co2g), 0.0001);
  const score = (c: (typeof candidates)[number]) =>
    mode === "cost"
      ? c.costEUR
      : mode === "carbon"
        ? c.co2g
        : (0.5 * c.costEUR) / maxCost + (0.5 * c.co2g) / maxCO2;
  const best = candidates.reduce((a, b) =>
    score(b) < score(a) - 1e-9 ? b : a,
  );
  const usual =
    candidates.find(
      (c) => timeLabel(c.start) === (appliance.usualStart ?? "19:00"),
    ) ?? candidates[0];
  return {
    applianceId: appliance.id,
    start: best.start,
    end: best.end,
    costEUR: best.costEUR,
    co2g: best.co2g,
    vsUsual: {
      savedEUR: usual.costEUR - best.costEUR,
      savedCO2g: usual.co2g - best.co2g,
    },
    usualStart: usual.start,
    reason:
      best.solar > 0.05
        ? "Uses forecast solar to reduce grid imports."
        : best.night === count
          ? "Fits entirely inside the lower night rate. " +
            (mode !== "cost" ? "Balances this with estimated grid carbon." : "")
          : "Chosen for " +
            (mode === "carbon"
              ? "the lowest estimated grid carbon."
              : mode === "cost"
                ? "the lowest import cost."
                : "a balance of cost and estimated carbon."),
  };
}
