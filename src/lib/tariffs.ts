import type { Band, Tariff } from "./types";

// Sample rates until a teammate checks real supplier prices. The UI shows
// `sample: true` as "Sample tariff". Bands follow the standard Irish smart
// time-of-use structure (day 08–23, night 23–08, peak 17–19).
export const TARIFFS: Tariff[] = [
  {
    id: "smart-standard",
    supplier: "Sample supplier",
    plan: "Smart time-of-use",
    rates: { day: 0.36, night: 0.19, peak: 0.42, boost: 0.19 },
    bands: [
      { band: "peak", from: "17:00", to: "19:00" },
      { band: "night", from: "23:00", to: "08:00" },
    ],
    standingPerDay: 0.8,
    exportRate: 0.185,
    source: "Sample rates, to be replaced with supplier prices",
    checkedOn: "2026-10-04",
    sample: true,
  },
  {
    id: "smart-ev",
    supplier: "Sample supplier",
    plan: "Smart EV with 02:00–05:00 boost",
    rates: { day: 0.37, night: 0.2, peak: 0.43, boost: 0.1 },
    bands: [
      { band: "peak", from: "17:00", to: "19:00" },
      { band: "boost", from: "02:00", to: "05:00" },
      { band: "night", from: "23:00", to: "08:00" },
    ],
    standingPerDay: 0.8,
    exportRate: 0.185,
    source: "Sample rates, to be replaced with supplier prices",
    checkedOn: "2026-10-04",
    sample: true,
  },
];

export function getTariff(id: string): Tariff {
  return TARIFFS.find((t) => t.id === id) ?? TARIFFS[0];
}

const toMin = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

export function bandAt(tariff: Tariff, localMinutes: number): Band {
  for (const b of tariff.bands) {
    const from = toMin(b.from);
    const to = toMin(b.to);
    const inside =
      from < to
        ? localMinutes >= from && localMinutes < to
        : localMinutes >= from || localMinutes < to;
    if (inside) return b.band;
  }
  return "day";
}
