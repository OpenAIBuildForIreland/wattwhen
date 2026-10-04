import { readFile } from "node:fs/promises";
import path from "node:path";

export type PvgisMonthly = { monthlyKWh: number[]; annualKWh: number; usedSample: boolean };

const cache = new Map<string, PvgisMonthly>();

type PvgisJson = {
  outputs: { monthly: { fixed: { E_m: number }[] }; totals: { fixed: { E_y: number } } };
};

const read = (j: PvgisJson) => ({
  monthlyKWh: j.outputs.monthly.fixed.map((m) => m.E_m),
  annualKWh: j.outputs.totals.fixed.E_y,
});

export async function pvgisMonthly(
  lat: number,
  lon: number,
  kWp: number,
  tilt: number,
  aspect: number,
): Promise<PvgisMonthly> {
  const key = [lat, lon, kWp, tilt, aspect].join("|");
  const hit = cache.get(key);
  if (hit) return hit;
  try {
    const url = `https://re.jrc.ec.europa.eu/api/v5_3/PVcalc?lat=${lat}&lon=${lon}&peakpower=${kWp}&loss=14&angle=${tilt}&aspect=${aspect}&outputformat=json`;
    const res = await fetch(url, { signal: AbortSignal.timeout(10000), cache: "no-store" });
    const out = { ...read(await res.json()), usedSample: false };
    cache.set(key, out);
    return out;
  } catch {
    // Sample is 4 kWp, south, 35°, Dublin. Scale by system size.
    const j = JSON.parse(
      await readFile(path.join(process.cwd(), "src/data/samples/pvgis-dublin-4kwp.json"), "utf8"),
    );
    const s = read(j);
    const k = kWp / 4;
    return { monthlyKWh: s.monthlyKWh.map((v) => v * k), annualKWh: s.annualKWh * k, usedSample: true };
  }
}
