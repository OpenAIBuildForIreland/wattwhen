# WattWhen

Find a better time to power an Irish home. WattWhen combines EirGrid wind and
carbon data, Met Éireann solar forecasts and PVGIS monthly generation estimates
with a household's tariff and flexible appliances.

Built for OpenAI Build for Ireland, 4 October 2026. This implementation lives on
`codex/build`, independently branched from the shared setup on `main`.

## Run

```bash
npm ci
cp .env.example .env.local
# Set OPENAI_API_KEY and OPENAI_MODEL for AI chat and bill-image extraction.
npm run dev -- --port 3100
```

Open http://localhost:3100. The planner, 3D house, solar year and fictional bill
demo work without an OpenAI key. Chat clearly switches to a calculated-plan
fallback when credentials are missing or the API is unavailable.

For a production preview:

```bash
npm run build
npm run start -- --port 3101
```

## Demo

1. Click **Use demo replay** for repeatable data from 4 October 2026.
2. Start with **Mam's house**. Select the immersion or laundry on the 3D house.
3. Switch between **Lower bills**, **Less carbon** and **A bit of both**. The
   cheapest night-rate window starts at 23:00; the cleaner sample window is later.
4. Pick **Solar + EV + battery**. The car, panels and battery appear; forecast
   solar contributes to each appliance's import estimate.
5. Open **Solar year** to compare generation, demand, exports and the running
   balance from April. It displays a deficit when summer credit is insufficient.
6. Open **Ask WattWhen**. With credentials, try “Charge my car from 30% to 80%
   by 08:00 tomorrow.” Tools compute charging duration and the deadline-constrained
   window. The assistant asks for missing state of charge.
7. Under **Customise your home → Read a sample bill**, try the fictional bill,
   review its rates and apply them. Or upload a public sample image using vision.
   No personal bill is needed. Extraction never applies rates automatically.

The desktop layout is checked at 1440×900, with a responsive layout at 390×844.
All times use Europe/Dublin. Flows in the house are illustrative; no appliances
are actually controlled.

## What is implemented

- Cached server-side source adapters, bounded retries and dated sample fallbacks.
- A 72-slot timeline with wind, estimated carbon, tariff bands and solar output.
- A deterministic cost/carbon/blended planner, deadlines and partial-hour energy.
- Synthetic household presets, county, solar roof and capacity, EV and appliance settings.
- Interactive procedural 3D house, time-sensitive lighting and reduced-motion support.
- PVGIS annual solar economics, capped self-use, monthly export credits and running balance.
- OpenAI Responses tool calling: `get_timeline`, `best_window`, `solar_year`.
- Structured bill vision extraction, editable review and application of sample rates.
  Raw images are not written to disk; supplier/plan/rates/consumption are the only
  extracted fields. Images go to OpenAI when that feature is configured.

## Data and limits

- [EirGrid Smart Grid Dashboard](https://www.smartgriddashboard.com/): carbon
  actuals and wind forecasts. The live endpoint is intermittent; the app visibly
  replays the dated grid samples if either grid series fails. Future carbon is
  our linear wind-based estimate, **not** an EirGrid carbon forecast. Wind after
  the published forecast horizon is held constant and flagged.
- [Met Éireann](https://www.met.ie/climate/available-data): hourly radiation,
  converted to approximate PV output with an assumed 80% performance ratio.
- [PVGIS / EU JRC](https://re.jrc.ec.europa.eu/pvg_tools/en/): long-term monthly
  generation. Its fallback is Dublin, south-facing, 35° and scales by kWp only;
  changing county, tilt or aspect does not change that fallback's shape.
- Tariffs and households are **illustrative**, not verified supplier offers or
  personal meter data. Reviewed sample-bill rates override import and standing
  charges; export remains the illustrative 19c/kWh. No tariff comparison is offered.
- Appliance windows are independent. Their solar savings **cannot be added** when
  windows overlap. There is no whole-home load allocation or battery dispatch model.
- Annual self-use assumes 35% without a battery and 65% with one, capped by demand.
  The annual bill assumes a 60% day / 30% night / 10% peak import mix and credit
  carryover. Billed kWh extracted from an image does not replace annual consumption.
- EV target charging ignores charging losses. A window must fit inside the
  available 36 hours. The app proposes times; it does not save or execute schedules.

Source details and timestamps are available in the app. Raw samples and endpoint
notes are in `src/data/samples/` and `docs/data-sources.md`.

## Validation

```bash
npm run lint
npm test
npm run build
# With a server already running on 3100:
npm run test:e2e
# Or test another local server:
TEST_BASE_URL=http://localhost:3101 npm run test:e2e
```

The unit suite covers optimisation tradeoffs, deadlines, partial slots, zero
imports, discontinuous timelines, Irish time and tariff boundaries, regression,
solar conservation, household validation and reviewed bill rates. Playwright
covers desktop interaction, responsive layout, solar settings, missing-key chat,
API validation and the sample-bill review flow. The fallback-chat test expects
no OpenAI credentials in the test server. Browser binaries can be installed with
`npx playwright install chromium` if they are not already available.

Live model responses and bill OCR need credentials and were not verified in this
worktree. The implementation follows the official [function calling](https://developers.openai.com/api/docs/guides/function-calling),
[vision](https://developers.openai.com/api/docs/guides/images-vision) and
[structured output](https://developers.openai.com/api/docs/guides/structured-outputs) documentation.

## Contributors

Start with `AGENTS.md`, then `docs/build-prompt.md`, `docs/product.md` and
`docs/data-sources.md`. Keep API keys server-side and out of git. This build has
no authentication, database or external model assets.
