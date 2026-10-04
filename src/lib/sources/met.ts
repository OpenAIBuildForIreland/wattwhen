import { readFile } from "node:fs/promises";
import path from "node:path";
import { XMLParser } from "fast-xml-parser";
import type { Series } from "../types";
import { cachedSource, fetchText } from "./fetch";
export async function solarRadiation(
  lat: number,
  lon: number,
  sample = false,
): Promise<Series> {
  const url = `http://openaccess.pf.api.met.ie/metno-wdb2ts/locationforecast?lat=${lat};long=${lon}`;
  const parse = (xml: string, usedSample: boolean): Series => {
    const data = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: "",
    }).parse(xml);
    const blocks = data.weatherdata?.product?.time;
    if (!Array.isArray(blocks)) throw new Error("Missing weather forecast");
    const points = blocks
      .filter((t) => t.from === t.to && t.location?.globalRadiation)
      .map((t) => ({
        time: new Date(t.from).toISOString(),
        value: +t.location.globalRadiation.value,
      }));
    if (!points.length || points.some((p) => !Number.isFinite(p.value)))
      throw new Error("Invalid radiation forecast");
    if (!usedSample && Date.parse(points.at(-1)!.time) < Date.now())
      throw new Error("Stale weather forecast");
    return {
      points,
      source: {
        name: "Met Éireann",
        url,
        fetchedAt: new Date().toISOString(),
        updatedAt: usedSample ? "2026-10-04T13:00:00Z" : points[0].time,
        usedSample,
        note: usedSample
          ? "Dublin sample; other locations are approximations. Solar output assumes 80% performance."
          : "Solar output assumes 80% performance.",
      },
    };
  };
  return cachedSource(
    url,
    async () => parse(await fetchText(url), false),
    async () =>
      parse(
        await readFile(
          path.join(process.cwd(), "src/data/samples/met-eireann-dublin.xml"),
          "utf8",
        ),
        true,
      ),
    sample,
  );
}
