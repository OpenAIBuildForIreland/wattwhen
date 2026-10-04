# WattWhen pitch

Live: https://wattwhen-nine.vercel.app · Code: https://github.com/OpenAIBuildForIreland/wattwhen

Numbers below come from the app on 4 Oct 2026, using live EirGrid and Met Éireann
data, sample tariff rates and synthetic households. Say "sample" and
"synthetic" when you quote them.

## Slides (5, demo-first)

1. **WattWhen.** "When should you use, store and sell your electricity?" Team
   names and the live URL.
2. **The problem.** Ireland's grid swings with the wind. Today grid carbon
   ran from 108 to 207 gCO2/kWh. Tonight wind is ~2.7 GW; by tomorrow evening
   it's ~0.4 GW. Prices and carbon change hour by hour, but nobody knows when
   to run the washing or charge the car. About half of homes are on a flat
   rate and don't know whether switching would pay. *(Kene's figure: 48%
   standard, 1% dynamic. Add the source before showing it.)*
3. **Who it helps.** Three households: flat rate (my mam), smart rate or EV,
   solar + battery.
4. **Demo.** The slide just shows the URL. Switch to the browser.
5. **Data and what's next.**
   - Data: EirGrid Smart Grid Dashboard (live CO2, wind forecast), Met Éireann
     (solar radiation forecast), PVGIS (annual solar). Claude Haiku 4.5 for the
     chat and bill reading.
   - The model never does the maths: € and CO2 come from code, and estimates
     are labelled.
   - Next: real supplier tariffs from a bill photo, wholesale-linked dynamic
     prices (SEMO day-ahead), a better CO2 forecast (r² is ~0.25 today),
     "run it now" nudges, and a proper 3D house.

## 2-minute script

**0:00 Hook (15s).** "My mam always complains about the electricity bill. She's
on a flat rate, like about half of Irish homes, so she's never been told when
to run anything."

**0:15 Problem (20s).** "But Ireland's grid isn't flat. It swings with the
wind. Tonight there's 2.7 gigawatts of wind; by tomorrow evening it's under
half a gigawatt. Same price, very different carbon. A tariff can't tell you
that. WattWhen can."

**0:35 Demo (60s).**
1. *Default tariff* is open. "This is her house. Live EirGrid data. On her
   flat rate, timing saves her €0. We say so. It still cuts carbon, and here's
   the line that matters: on a smart rate, today's plan would save €2.77."
2. Click *Smart rate*. "Same house on a smart plan. Every appliance gets a
   best window, in green, against her usual time, in red."
3. Flip *Optimise for* between Cost and Carbon. "Cost or carbon, you choose.
   Watch the windows move."
4. Click *EV*, then open *Ask WattWhen*: "My car needs 80% by 8am tomorrow."
   "It answers with live data through tools. Claude explains; the numbers
   come from our code."
5. Click *Solar + EV + battery*, then the *Solar year* tab. "For solar homes:
   from May to July the grid pays you, and that credit offsets winter."

**1:35 Data and honesty (15s).** "EirGrid, Met Éireann and PVGIS, all
public. Estimates are labelled, tariffs are samples for now, and households
are synthetic."

**1:50 Close (10s).** "Next: upload your bill and get your real tariff. Half
of Ireland is on a flat rate. WattWhen shows them whether switching pays.
Thanks."

## Demo checklist

- Open the live URL 2 minutes before. Run the EV chat question once to warm
  it up (first call takes a few seconds).
- Start on *Default tariff*, *Optimise for: Both*, the *Next 36 hours* tab.
- Fallback: `npm run dev` on the laptop (localhost). Data falls back to dated
  samples if EirGrid is down.
- ⌘D hides the preset bar if you want a clean screen for screenshots.

## Likely questions

- **"Is the CO2 forecast real?"** EirGrid publishes actuals only. We forecast
  from their wind forecast with a simple regression, labelled as an estimate.
- **"Where do tariffs come from?"** Sample rates today. Next step is reading
  them off your bill photo; the reader already works.
- **"Does this work on a flat rate?"** Not for cost, and we show €0. It works
  for carbon, for solar self-use, and for deciding whether to switch.
