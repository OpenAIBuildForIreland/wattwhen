import co2 from "@/data/samples/eirgrid-co2intensity.json";
import wind from "@/data/samples/eirgrid-windforecast.json";
import { eirDate, irishToISO } from "../time";
import type { Series } from "../types";
import { cachedSource, fetchText } from "./fetch";
type Raw = { LastUpdated: string; Rows: { EffectiveTime: string; Value: number | null }[] };
const samples: Record<string, Raw> = { co2intensity: co2, windforecast: wind };
export async function fetchSeries(area: "co2intensity" | "windforecast", from: Date, to: Date, sample = false): Promise<Series> {
  const url = `https://www.smartgriddashboard.com/DashboardService.svc/data?${new URLSearchParams({ area, region: "ALL", datefrom: eirDate(from) + " 00:00", dateto: eirDate(to) + " 23:59" })}`;
  const parse = (raw: Raw, usedSample: boolean): Series => {
    if (!Array.isArray(raw.Rows)) throw new Error("Missing EirGrid rows");
    const points = raw.Rows.filter(r => typeof r.Value === "number" && Number.isFinite(r.Value)).map(r => ({ time: irishToISO(r.EffectiveTime), value: r.Value! })).sort((a,b) => a.time.localeCompare(b.time));
    if (!points.length) throw new Error("Empty EirGrid series");
    if (!usedSample && Date.parse(points.at(-1)!.time) < Date.now() - 3 * 3600_000) throw new Error("Stale EirGrid series");
    return { points, source: { name: `EirGrid · ${area === "co2intensity" ? "carbon" : "wind forecast"}`, url, fetchedAt: new Date().toISOString(), updatedAt: irishToISO(raw.LastUpdated), usedSample } };
  };
  return cachedSource(url, async () => parse(JSON.parse(await fetchText(url)), false), async () => parse(samples[area], true), sample);
}
