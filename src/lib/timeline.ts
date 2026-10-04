import { eirgridSeries, type Point } from "./sources/eirgrid";
import { solarRadiation } from "./sources/met";
import { bandAt, getTariff } from "./tariffs";
import { floorToSlot, localMinutes, SLOT_MS } from "./time";
import type { Slot, Timeline } from "./types";

const HOUR = 3600 * 1000;
const PERFORMANCE_RATIO = 0.8; // assumption, labelled in the UI

// Least squares co2 = a + b·wind on timestamps where both exist.
function fitCo2OnWind(co2: Point[], wind: Point[]) {
  const windAt = new Map(wind.map((p) => [p.t, p.v]));
  const pairs = co2.filter((p) => windAt.has(p.t)).map((p) => [windAt.get(p.t)!, p.v]);
  const n = pairs.length;
  if (n < 8) return { a: 200, b: 0, r2: 0, n };
  const mx = pairs.reduce((s, [x]) => s + x, 0) / n;
  const my = pairs.reduce((s, [, y]) => s + y, 0) / n;
  let sxy = 0, sxx = 0, syy = 0;
  for (const [x, y] of pairs) {
    sxy += (x - mx) * (y - my);
    sxx += (x - mx) ** 2;
    syy += (y - my) ** 2;
  }
  const b = sxx ? sxy / sxx : 0;
  const a = my - b * mx;
  const r2 = sxx && syy ? (sxy * sxy) / (sxx * syy) : 0;
  return { a, b, r2, n };
}

const avgIn = (pts: Point[], from: number, to: number) => {
  const xs = pts.filter((p) => p.t >= from && p.t < to);
  return xs.length ? xs.reduce((s, p) => s + p.v, 0) / xs.length : null;
};

export async function buildTimeline(opts: {
  tariffId: string;
  lat: number;
  lon: number;
  hoursBack?: number;
}): Promise<Timeline> {
  const now = new Date();
  const tariff = getTariff(opts.tariffId);
  const [co2, wind, sun] = await Promise.all([
    eirgridSeries("co2intensity", new Date(now.getTime() - 24 * HOUR), now),
    eirgridSeries("windforecast", new Date(now.getTime() - 24 * HOUR), new Date(now.getTime() + 24 * HOUR)),
    solarRadiation(opts.lat, opts.lon),
  ]);

  const fit = fitCo2OnWind(co2.points, wind.points);
  const lastCo2 = Math.max(...co2.points.map((p) => p.t));
  const lastWind = Math.max(...wind.points.map((p) => p.t));
  const start = floorToSlot(new Date(now.getTime() - (opts.hoursBack ?? 6) * HOUR)).getTime();
  const end = Math.min(start + 42 * HOUR, lastWind);

  const slots: Slot[] = [];
  for (let t = start; t < end; t += SLOT_MS) {
    const windMW = avgIn(wind.points, t, t + SLOT_MS);
    let co2v = avgIn(co2.points, t, t + SLOT_MS);
    let estimated = false;
    if (co2v === null && t > lastCo2 - SLOT_MS && windMW !== null) {
      co2v = Math.min(600, Math.max(50, fit.a + fit.b * windMW));
      estimated = true;
    }
    const rad = sun.points.reduce<{ d: number; w: number } | null>((best, p) => {
      const d = Math.abs(p.t - (t + SLOT_MS / 2));
      return d < 45 * 60 * 1000 && (!best || d < best.d) ? { d, w: p.wm2 } : best;
    }, null);
    const band = bandAt(tariff, localMinutes(new Date(t)));
    slots.push({
      start: new Date(t).toISOString(),
      co2: co2v === null ? null : Math.round(co2v),
      co2Estimated: estimated,
      windMW: windMW === null ? null : Math.round(windMW),
      band,
      price: tariff.rates[band],
      solarKW: rad ? +((rad.w / 1000) * PERFORMANCE_RATIO).toFixed(3) : null,
      past: t + SLOT_MS <= now.getTime(),
    });
  }

  return {
    slots,
    now: now.toISOString(),
    fit: { a: +fit.a.toFixed(2), b: +fit.b.toFixed(4), r2: +fit.r2.toFixed(2), n: fit.n },
    sources: [
      { name: "EirGrid · CO2 intensity", url: "https://www.smartgriddashboard.com/", fetchedAt: co2.fetchedAt, usedSample: co2.usedSample },
      { name: "EirGrid · wind forecast", url: "https://www.smartgriddashboard.com/", fetchedAt: wind.fetchedAt, usedSample: wind.usedSample },
      { name: "Met Éireann · solar radiation", url: "https://www.met.ie/climate/available-data", fetchedAt: sun.fetchedAt, usedSample: sun.usedSample },
    ],
  };
}
