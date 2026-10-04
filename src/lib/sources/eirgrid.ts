import { readFile } from "node:fs/promises";
import path from "node:path";
import { eirgridDay, parseEirgridTime } from "../time";

export type EirgridArea = "co2intensity" | "windforecast" | "demandactual" | "SnspAll";
export type Point = { t: number; v: number };

const BASE = "https://www.smartgriddashboard.com/DashboardService.svc/data";
const TTL_MS = 10 * 60 * 1000;
const cache = new Map<string, { at: number; points: Point[] }>();

type Rows = { Rows?: { EffectiveTime: string; Value: number | null }[] };

function toPoints(json: Rows): Point[] {
  return (json.Rows ?? [])
    .filter((r) => r.Value !== null && r.Value !== undefined)
    .map((r) => ({ t: parseEirgridTime(r.EffectiveTime).getTime(), v: Number(r.Value) }));
}

async function fetchLive(area: EirgridArea, from: Date, to: Date): Promise<Point[]> {
  const url = `${BASE}?area=${area}&region=ALL&datefrom=${eirgridDay(from)}&dateto=${eirgridDay(to).replace("00:00", "23:59")}`;
  let lastErr: unknown;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": "WattWhen/0.1 (Build for Ireland hackathon)" },
        signal: AbortSignal.timeout(8000),
        cache: "no-store",
      });
      const text = (await res.text()).replace(/^\uFEFF/, "").trim();
      if (!res.ok || !text.startsWith("{")) throw new Error(`EirGrid ${area}: ${res.status}`);
      const points = toPoints(JSON.parse(text));
      if (!points.length) throw new Error(`EirGrid ${area}: no rows`);
      return points;
    } catch (e) {
      lastErr = e;
      await new Promise((r) => setTimeout(r, 600 * (attempt + 1)));
    }
  }
  throw lastErr;
}

async function fromSample(area: EirgridArea): Promise<Point[]> {
  const file = path.join(process.cwd(), "src/data/samples", `eirgrid-${area}.json`);
  return toPoints(JSON.parse(await readFile(file, "utf8")));
}

export async function eirgridSeries(
  area: EirgridArea,
  from: Date,
  to: Date,
): Promise<{ points: Point[]; usedSample: boolean; fetchedAt: string }> {
  const key = `${area}|${eirgridDay(from)}|${eirgridDay(to)}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) {
    return { points: hit.points, usedSample: false, fetchedAt: new Date(hit.at).toISOString() };
  }
  try {
    const points = await fetchLive(area, from, to);
    cache.set(key, { at: Date.now(), points });
    return { points, usedSample: false, fetchedAt: new Date().toISOString() };
  } catch (e) {
    console.warn(`[eirgrid] ${area} live fetch failed, using sample:`, e);
    return { points: await fromSample(area), usedSample: true, fetchedAt: "2026-10-04T13:45:00Z" };
  }
}
