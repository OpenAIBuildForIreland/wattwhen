# Build prompt: WattWhen

Paste this into a coding agent (Codex, Claude Code) started in the repo root.
It's self-contained, but the agent should also read `AGENTS.md` and `docs/`.

---

You are building **WattWhen**, a web app for the OpenAI "Build for Ireland"
hackathon (Dublin, 4 Oct 2026). Submissions close at **16:00 today**. Assume
you have about 90 minutes. A working, good-looking demo of the core flow beats
breadth. Work on your own branch (`git checkout -b <agent-name>/build`).

## What it does

WattWhen tells an Irish household **when** to use, store and sell
electricity. Ireland's grid carbon swings with the wind, and the cheap tariff
hours don't always match the clean hours. Example from today's data: tonight
00:00–06:00 is windy (~2,700 MW wind forecast) and inside the night rate, so
it's both cheap and clean. Tomorrow by 21:00 wind collapses to ~400 MW, so
the same night rate will be much dirtier. A tariff can't tell you that.
WattWhen can.

Users (one household can mix them): a general household (no solar or
EV, complains about bills), an EV owner, a solar owner
with an optional battery.

## Read before coding

1. `AGENTS.md`: project rules. **Next.js 16 has breaking changes. Read the
   relevant guide in `node_modules/next/dist/docs/` before writing route
   handlers or layouts.**
2. `docs/product.md`: features, facts-vs-AI rules, demo script.
3. `docs/data-sources.md`: exact endpoints, response shapes and quirks.
   Samples are in `src/data/samples/`.
4. Use the `ui-ux-pro-max` skill to pick a design system (dark theme,
   energy-coloured accents) and the `framer-motion` skill for animation.
   Check OpenAI SDK usage through the OpenAI docs MCP, not from memory.

## Stack (already installed)

Next.js 16 App Router, TypeScript, Tailwind v4, `three` +
`@react-three/fiber` v9 + `@react-three/drei` v10, `motion` v14 (import from
`motion/react`), `openai` v7, `fast-xml-parser`. Env vars: `OPENAI_API_KEY`,
`OPENAI_MODEL` (in `.env.local`, server only).

## Architecture

```
src/lib/
  types.ts           shared types (below)
  sources/eirgrid.ts fetchSeries(area, from, to): retries with backoff, 10-min
                     in-memory cache, falls back to src/data/samples/eirgrid-<area>.json
  sources/met.ts     solar radiation forecast (hourly W/m², UTC → Europe/Dublin), sample fallback
  sources/pvgis.ts   monthly PV kWh for lat/lon/kWp/tilt/aspect, sample fallback
  forecast.ts        CO2 estimate: least squares co2 = a + b·windMW on past
                     slots where both exist; predict future slots; mark estimated
  tariffs.ts         tariff table: bands (day 08–23, night 23–08, peak 17–19),
                     rates, standing charge, export rate, source URL,
                     checkedOn, sample: true until verified
  households.ts      3 synthetic households: "General household", "EV commuter",
                     "Solar + EV + battery"; appliances with kW and duration;
                     monthly kWh; labelled synthetic
  planner.ts         best windows (algorithm below)
  solarYear.ts       month-by-month solar economics (below)
src/app/api/
  grid/route.ts      GET: 36h timeline = 30-min slots of { time, co2,
                     co2Estimated, windMW, tariffBand, price, solarKW? } + meta
                     { sources, fetchedAt, usedSample }
  plan/route.ts      POST { household, mode } → best window per appliance
  chat/route.ts      POST messages → OpenAI with function tools: get_timeline,
                     best_window(appliance, deadline?), solar_year(). Tools
                     call src/lib; the model only explains
  bill/route.ts      (should-have) POST image → vision extraction of supplier,
                     plan, unit rates, standing charge, kWh; ignore personal details
src/components/
  House3D.tsx        r3f scene (below)
  Timeline.tsx       SVG timeline (below)
  SetupPanel.tsx     household picker + toggles + optimise-for control
  SolarYear.tsx      12-month chart + credit balance line
  Chat.tsx           Ask WattWhen drawer
  SourceBadge.tsx    "Data · EirGrid · 14:15", "Estimate", "AI", "Sample data"
```

Core types:

```ts
type Mode = "cost" | "carbon" | "both";
type Slot = { start: string; co2: number; co2Estimated: boolean; windMW?: number;
              band: "day" | "night" | "peak"; price: number; solarKW?: number };
type Appliance = { id: string; name: string; kW: number; hours: number;
                   usualStart?: string; flexible: boolean };
type Household = { id: string; name: string; synthetic: true; county: string;
                   lat: number; lon: number; annualKWh: number;
                   ev?: { batteryKWh: number; chargerKW: number };
                   solar?: { kWp: number; aspect: number; tilt: number };
                   battery?: { kWh: number }; appliances: Appliance[];
                   tariffId: string };
type Window = { applianceId: string; start: string; end: string;
                costEUR: number; co2g: number;
                vsUsual: { savedEUR: number; savedCO2g: number };
                reason: string };   // reason is built from code, not the model
```

## Algorithms

**Best window.** 30-min slots over the next 36h. For each appliance, slide a
window of `ceil(hours × 2)` slots. Grid import per slot =
`max(0, kW/2 − solarKW/2)` kWh. Cost = Σ import × price. CO2 = Σ import ×
co2. Score: `cost` mode uses cost, `carbon` mode uses CO2, `both` uses 0.5 ×
cost/maxCost + 0.5 × co2/maxCO2. Pick the lowest score that ends before any
deadline. Compare with `usualStart` (default 19:00) for savings.

**CO2 forecast.** Pair the actual `co2intensity` with `windforecast` at the
same timestamps (last 24–48h), fit linear least squares, predict future
slots, clamp to [50, 600]. Every future slot is `co2Estimated: true`.

**Solar year.** PVGIS monthly kWh × (kWp / 4 if you use the 4 kWp sample).
Self-use share of generation is an assumption: 35% without a battery, 65%
with one (label it). Export = generation − self-use. Import = monthly use −
self-use. Bill = import × average unit rate + standing charge. Export credit
= export × export rate. Plot monthly net and a running credit balance from
April.

## UI

Dark, premium energy-dashboard feel. Desktop-first, 1440×900 demo screen.

- **Left 60%: 3D house** (react-three-fiber, procedural geometry, no external
  models). A low-poly two-storey Irish semi-d on a grass plot, with an
  isometric-ish orbit camera, soft shadows and an environment light. Toggle
  components from setup: solar panels on the south roof, EV in the driveway
  with a wall charger, a battery unit on the side wall, and appliances visible
  through a cutaway or as floating labelled icons (washing machine, dryer,
  dishwasher, immersion tank, heat pump outside). Hovering highlights an
  appliance; clicking selects it, shows its best window card and highlights
  the window on the timeline. Animated energy particles along curves: sun →
  panels → house, house → EV/battery, house ↔ grid pole. Particle rate scales
  with the current kW. Sky and sun position follow the selected time.
- **Right 40%: setup panel and best-window cards.** Each card shows the
  appliance, the window, € and CO2 saved vs usual, and a code-built reason.
  The optimise-for control is cost / carbon / both, and changing it animates
  the windows to their new positions.
- **Bottom: 36h timeline** across the full width. A gradient band coloured by
  CO2 (green < 150, amber 150–250, red > 250 g/kWh), dashed where estimated.
  Tariff band strips below, a solar forecast area if solar, a "now" line,
  selected windows glowing. Hover tooltip with exact values and source.
- **Tabs or segmented control:** Today | Solar year.
- **Chat drawer** (bottom-right button): "Ask WattWhen".
- **Source badges** everywhere numbers appear.

## Order of work (check off as you go)

1. `sources/*` + `forecast.ts` + `/api/grid`, verified with curl (live and
   sample fallback).
2. `tariffs.ts`, `households.ts`, `planner.ts` + `/api/plan`, checked with
   curl for the general household in all three modes.
3. Timeline + setup panel + window cards on the page with live data.
4. House3D with toggles and selection linked to the timeline.
5. Solar year view.
6. Chat with tools.
7. Bill photo (only if time remains).
8. Polish: loading states, source badges, motion.

After each UI step, open the app with the Playwright MCP, take a screenshot
at 1440×900, and fix what looks wrong. Run `npm run build` before you
finish. Commit after each working step.

## Don't

- Don't call external APIs from the client. Go through `/api/*`.
- Don't let the model compute € or CO2.
- Don't use real personal data. Households are synthetic; bills are samples.
- Don't add auth, databases or user accounts.
- Don't spend more than 20 minutes on any one visual effect.
