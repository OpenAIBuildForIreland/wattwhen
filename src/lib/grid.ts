import { fetchSeries } from "./sources/eirgrid";
import { solarRadiation } from "./sources/met";
import { fitCarbon, interpolate, predictCarbon } from "./forecast";
import { tariffAt, tariffFor } from "./tariffs";
import { HALF_HOUR, SAMPLE_NOW } from "./time";
import type { Grid, Household } from "./types";
export async function getGrid(
  household?: Household,
  forceSample = false,
): Promise<Grid> {
  const now = new Date();
  const from = new Date(now.getTime() - 48 * 3600_000),
    to = new Date(now.getTime() + 48 * 3600_000);
  let carbon = await fetchSeries("co2intensity", from, to, forceSample);
  let wind = await fetchSeries("windforecast", from, to, forceSample);
  const usedSample = carbon.source.usedSample || wind.source.usedSample;
  if (usedSample) {
    carbon = await fetchSeries("co2intensity", from, to, true);
    wind = await fetchSeries("windforecast", from, to, true);
  }
  const anchor = usedSample
    ? SAMPLE_NOW
    : new Date(Math.ceil(now.getTime() / HALF_HOUR) * HALF_HOUR).toISOString();
  const model = fitCarbon(carbon, wind);
  const radiation = household?.solar
    ? await solarRadiation(household.lat, household.lon, usedSample)
    : null;
  const slots = Array.from({ length: 72 }, (_, i) => {
    const time = Date.parse(anchor) + i * HALF_HOUR,
      start = new Date(time).toISOString();
    const windMW = interpolate(wind, time);
    const actual = carbon.points.find(
      (p) => p.time === start && time <= Date.parse(anchor),
    );
    return {
      start,
      windMW,
      windExtrapolated: time > Date.parse(wind.points.at(-1)!.time),
      co2: actual?.value ?? predictCarbon(model, windMW),
      co2Estimated: !actual,
      ...tariffAt(start, tariffFor(household)),
      ...(radiation
        ? {
            solarKW: Math.max(
              0,
              ((interpolate(radiation, time) * household!.solar!.kWp) / 1000) *
                0.8,
            ),
          }
        : {}),
    };
  });
  return {
    slots,
    meta: {
      sources: [
        carbon.source,
        wind.source,
        ...(radiation ? [radiation.source] : []),
      ],
      fetchedAt: now.toISOString(),
      usedSample: usedSample || !!radiation?.source.usedSample,
      anchor,
      regression: model,
      note: usedSample
        ? "Dated demo replay · 4–6 October 2026. Future carbon is a wind-based estimate; wind beyond the source horizon is held constant."
        : "Future carbon is a wind-based estimate, not an EirGrid forecast. Wind beyond the source horizon is held constant.",
    },
  };
}
