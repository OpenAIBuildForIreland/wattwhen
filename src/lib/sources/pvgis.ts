import sampleData from "@/data/samples/pvgis-dublin-4kwp.json";
import type { Household, Source } from "../types";
import { cachedSource, fetchText } from "./fetch";
export async function monthlyPV(
  household: Household,
  sample = false,
): Promise<{ months: number[]; source: Source }> {
  const solar = household.solar!;
  const url = `https://re.jrc.ec.europa.eu/api/v5_3/PVcalc?${new URLSearchParams({ lat: String(household.lat), lon: String(household.lon), peakpower: String(solar.kWp), loss: "14", angle: String(solar.tilt), aspect: String(solar.aspect), outputformat: "json" })}`;
  const parse = (data: typeof sampleData, usedSample: boolean) => {
    const months = data.outputs?.monthly?.fixed?.map(
      (m) => m.E_m * (usedSample ? solar.kWp / 4 : 1),
    );
    if (
      months?.length !== 12 ||
      months.some((m) => !Number.isFinite(m) || m < 0)
    )
      throw new Error("Invalid PVGIS output");
    return {
      months,
      source: {
        name: "PVGIS · EU JRC",
        url,
        fetchedAt: new Date().toISOString(),
        updatedAt: usedSample
          ? "2026-10-04T13:00:00Z"
          : new Date().toISOString(),
        usedSample,
        note: usedSample
          ? "Dublin, south-facing 35° sample scaled by kWp; location and roof changes are not modelled in fallback."
          : "Long-term monthly model, not this year's weather forecast.",
      },
    };
  };
  return cachedSource(
    url,
    async () => parse(JSON.parse(await fetchText(url)), false),
    async () => parse(sampleData, true),
    sample,
  );
}
