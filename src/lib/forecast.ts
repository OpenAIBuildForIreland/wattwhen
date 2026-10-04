import type { Series } from "./types";
export function fitCarbon(carbon: Series, wind: Series) {
  const lookup = new Map(wind.points.map((p) => [p.time, p.value]));
  const pairs = carbon.points
    .filter((p) => lookup.has(p.time))
    .map((p) => ({ x: lookup.get(p.time)!, y: p.value }));
  if (pairs.length < 3)
    return { a: carbon.points.at(-1)?.value ?? 250, b: 0, pairs: pairs.length };
  const mx = pairs.reduce((s, p) => s + p.x, 0) / pairs.length,
    my = pairs.reduce((s, p) => s + p.y, 0) / pairs.length;
  const variance = pairs.reduce((s, p) => s + (p.x - mx) ** 2, 0);
  const b = variance
    ? pairs.reduce((s, p) => s + (p.x - mx) * (p.y - my), 0) / variance
    : 0;
  return { a: my - b * mx, b, pairs: pairs.length };
}
export function predictCarbon(model: { a: number; b: number }, wind: number) {
  return Math.max(50, Math.min(600, model.a + model.b * wind));
}
export function interpolate(series: Series, time: number) {
  const p = series.points;
  if (time <= Date.parse(p[0].time)) return p[0].value;
  for (let i = 1; i < p.length; i++)
    if (Date.parse(p[i].time) >= time) {
      const fraction =
        (time - Date.parse(p[i - 1].time)) /
        (Date.parse(p[i].time) - Date.parse(p[i - 1].time));
      return p[i - 1].value + (p[i].value - p[i - 1].value) * fraction;
    }
  return p.at(-1)!.value;
}
