import { readFile } from "node:fs/promises";
import path from "node:path";
import { XMLParser } from "fast-xml-parser";

export type RadiationPoint = { t: number; wm2: number };

const TTL_MS = 30 * 60 * 1000;
const cache = new Map<string, { at: number; points: RadiationPoint[] }>();
const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "" });

type MetTime = {
  from: string;
  to: string;
  location?: { globalRadiation?: { value: string } };
};

function parse(xml: string): RadiationPoint[] {
  const doc = parser.parse(xml);
  const times: MetTime[] = doc?.weatherdata?.product?.time ?? [];
  return times
    .filter((t) => t.from === t.to && t.location?.globalRadiation)
    .map((t) => ({ t: Date.parse(t.from), wm2: Number(t.location!.globalRadiation!.value) }));
}

export async function solarRadiation(
  lat: number,
  lon: number,
): Promise<{ points: RadiationPoint[]; usedSample: boolean; fetchedAt: string }> {
  const key = `${lat.toFixed(2)},${lon.toFixed(2)}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) {
    return { points: hit.points, usedSample: false, fetchedAt: new Date(hit.at).toISOString() };
  }
  try {
    const url = `http://openaccess.pf.api.met.ie/metno-wdb2ts/locationforecast?lat=${lat};long=${lon}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000), cache: "no-store" });
    const points = parse(await res.text());
    if (!points.length) throw new Error("Met Éireann: no radiation");
    cache.set(key, { at: Date.now(), points });
    return { points, usedSample: false, fetchedAt: new Date().toISOString() };
  } catch {
    const xml = await readFile(path.join(process.cwd(), "src/data/samples/met-eireann-dublin.xml"), "utf8");
    return { points: parse(xml), usedSample: true, fetchedAt: "2026-10-04T12:39:00Z" };
  }
}
