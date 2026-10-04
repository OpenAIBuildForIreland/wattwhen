import test from "node:test";
import assert from "node:assert/strict";
import { bestWindow } from "../src/lib/planner";
import { fitCarbon, predictCarbon } from "../src/lib/forecast";
import { irishToISO, HALF_HOUR } from "../src/lib/time";
import { tariffAt } from "../src/lib/tariffs";
import { getGrid } from "../src/lib/grid";
import { households, readHousehold } from "../src/lib/households";
import { solarYear } from "../src/lib/solarYear";
import type { Appliance, Series, Slot } from "../src/lib/types";
const appliance: Appliance = {
  id: "test",
  name: "Test",
  kW: 2,
  hours: 1,
  usualStart: "19:00",
  flexible: true,
};
function slots(
  prices: number[],
  carbon: number[] = prices.map(() => 200),
  solar = 0,
): Slot[] {
  return prices.map((price, i) => ({
    start: new Date(
      Date.parse("2026-10-04T18:00:00Z") + i * HALF_HOUR,
    ).toISOString(),
    price,
    co2: carbon[i],
    co2Estimated: true,
    windMW: 1000,
    band: "day",
    solarKW: solar,
  }));
}
test("cost and carbon optimise different windows and savings compare the usual run", () => {
  const s = slots([0.4, 0.4, 0.1, 0.1], [100, 100, 400, 400]);
  const cost = bestWindow(s, appliance, "cost")!,
    carbon = bestWindow(s, appliance, "carbon")!;
  assert.equal(cost.start, s[2].start);
  assert.equal(carbon.start, s[0].start);
  assert.ok(Math.abs(cost.vsUsual.savedEUR - 0.6) < 1e-9);
  assert.equal(cost.vsUsual.savedCO2g, -600);
});
test("deadline excludes late and impossible windows", () => {
  const s = slots([0.4, 0.4, 0.1, 0.1]);
  assert.equal(bestWindow(s, appliance, "cost", s[2].start)!.start, s[0].start);
  assert.equal(bestWindow(s, appliance, "cost", s[1].start), null);
  assert.throws(() => bestWindow(s, appliance, "both", "bad"));
});
test("partial final slots charge only the appliance duration", () => {
  const result = bestWindow(
    slots([0.2, 0.2]),
    { ...appliance, hours: 0.75 },
    "cost",
  )!;
  assert.ok(Math.abs(result.costEUR - 0.3) < 1e-9);
  assert.equal(result.co2g, 300);
});
test("solar never creates negative imports and zero-cost blend stays finite", () => {
  const w = bestWindow(
    slots([0.2, 0.2, 0.2], undefined, 10),
    appliance,
    "both",
  )!;
  assert.equal(w.costEUR, 0);
  assert.equal(w.co2g, 0);
  assert.ok(Number.isFinite(w.vsUsual.savedEUR));
});
test("missing timeline slots cannot form a schedulable window", () => {
  const s = slots([0.2, 0.2]);
  s[1].start = new Date(Date.parse(s[1].start) + HALF_HOUR).toISOString();
  assert.equal(bestWindow(s, appliance, "cost"), null);
});
test("Irish summer and winter conversion and tariff boundaries", () => {
  assert.equal(irishToISO("04-Oct-2026 14:00:00"), "2026-10-04T13:00:00.000Z");
  assert.equal(irishToISO("04-Jan-2026 14:00:00"), "2026-01-04T14:00:00.000Z");
  assert.equal(tariffAt("2026-10-04T22:00:00Z").band, "night");
  assert.equal(tariffAt("2026-10-04T16:00:00Z").band, "peak");
  assert.equal(tariffAt("2026-10-04T18:00:00Z").band, "day");
  assert.equal(tariffAt("2026-10-04T07:00:00Z").band, "day");
  assert.equal(tariffAt("2026-10-25T07:30:00Z").band, "night");
  assert.equal(tariffAt("2026-10-25T08:00:00Z").band, "day");
});
test("regression pairs timestamps, handles constant wind and clamps predictions", () => {
  const source = {
    name: "test",
    url: "",
    fetchedAt: "",
    updatedAt: "",
    usedSample: true,
  };
  const wind: Series = {
    source,
    points: [0, 1, 2].map((i) => ({ time: String(i), value: i * 100 })),
  };
  const carbon: Series = {
    source,
    points: [0, 1, 2].map((i) => ({ time: String(i), value: 300 - i * 50 })),
  };
  const model = fitCarbon(carbon, wind);
  assert.equal(model.a, 300);
  assert.equal(model.b, -0.5);
  assert.equal(predictCarbon(model, 200), 200);
  assert.equal(predictCarbon(model, 10000), 50);
  assert.equal(predictCarbon(model, -10000), 600);
  assert.ok(
    Number.isFinite(
      fitCarbon(carbon, {
        ...wind,
        points: wind.points.map((p) => ({ ...p, value: 10 })),
      }).a,
    ),
  );
});
test("sample timeline is dated, complete, finite and labels extrapolation", async () => {
  const grid = await getGrid(households[0], true);
  assert.equal(grid.slots.length, 72);
  assert.equal(grid.meta.usedSample, true);
  assert.equal(grid.meta.anchor, "2026-10-04T13:00:00.000Z");
  assert.ok(grid.meta.sources.every((s) => s.usedSample));
  assert.ok(grid.slots.slice(1).every((s) => s.co2Estimated));
  assert.ok(grid.slots.at(-1)!.windExtrapolated);
  assert.ok(
    grid.slots.every(
      (s) => Number.isFinite(s.co2) && s.co2 >= 50 && s.co2 <= 600,
    ),
  );
});
test("solar accounting conserves generation and caps self-use at demand", async () => {
  const h = { ...households[2], annualKWh: 100 };
  const result = await solarYear(h, true);
  for (const m of result.months) {
    assert.ok(m.selfUse <= m.usage);
    assert.ok(m.imported >= 0);
    assert.ok(Math.abs(m.selfUse + m.exported - m.generation) < 1e-8);
    assert.ok(Math.abs(m.net - (m.bill - m.credit)) < 1e-8);
  }
  assert.ok(Math.abs(result.months.at(-1)!.balance + result.annual.net) < 1e-8);
  assert.equal(result.months[0].label, "Apr");
  assert.ok(result.source.usedSample);
});
test("fallback solar scales with system size and preserves assumption metadata", async () => {
  const h = households[2];
  const a = await solarYear(h, true),
    b = await solarYear({ ...h, solar: { ...h.solar!, kWp: 8 } }, true);
  assert.ok(Math.abs(b.annual.generation - a.annual.generation * 2) < 1e-6);
  assert.equal(a.assumptions.selfUseShare, 0.65);
  assert.equal(
    (await solarYear({ ...h, battery: undefined }, true)).assumptions
      .selfUseShare,
    0.35,
  );
});
test("household validation rejects invalid and duplicate loads", () => {
  assert.throws(() => readHousehold({ ...households[0], annualKWh: -1 }));
  assert.throws(() =>
    readHousehold({ ...households[0], appliances: [appliance] }),
  );
  assert.throws(() =>
    readHousehold({
      ...households[0],
      appliances: [households[0].appliances[0], households[0].appliances[0]],
    }),
  );
  assert.throws(() => readHousehold("unknown"));
  assert.equal(readHousehold("mam").id, "mam");
});
test("reviewed bill rates reach both scheduling and annual solar economics", async () => {
  const h = {
    ...households[2],
    billTariff: {
      supplier: "Demo",
      plan: "Test",
      day: 0.5,
      night: 0.3,
      peak: 0.6,
      standingPerDay: 1,
    },
  };
  const grid = await getGrid(h, true);
  assert.ok(
    grid.slots.filter((s) => s.band === "night").every((s) => s.price === 0.3),
  );
  const baseline = await solarYear(households[2], true),
    changed = await solarYear(h, true);
  assert.ok(changed.annual.bill > baseline.annual.bill);
  assert.equal(changed.annual.credit, baseline.annual.credit);
  assert.throws(() =>
    readHousehold({ ...h, billTariff: { ...h.billTariff, night: null } }),
  );
});
