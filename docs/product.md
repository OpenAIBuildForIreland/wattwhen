# WattWhen: product decisions

> We're helping Irish households decide **when** to use, store and sell their
> electricity, using live EirGrid grid data, Met Éireann solar forecasts and
> PVGIS solar estimates.

## Who it's for

One household can be any mix of these:

- **General household.** No solar, no EV. The pitch story is Kene's mum,
  always complaining about the electricity bill.
- **EV owner.** The biggest flexible load (around 7 kW for several hours).
- **Solar owner**, optionally with a home battery.

Be honest about which loads matter. Shifting a dishwasher saves cents. EV
charging, the immersion, a heat pump and solar self-use are where the money is.

## Core insight

The cheap tariff hours and the clean grid hours don't always line up. Ireland's
grid carbon swings with the wind. A tariff alone can't tell you that tonight's
night rate is clean (high wind) but tomorrow night's is dirty (wind collapses).
WattWhen can.

Example from the 4 Oct 2026 data: wind forecast ~2,700 MW from 00:00 to 06:00
on 5 Oct (inside the night rate), falling to ~400 MW by 21:00 on 5 Oct.

## "Optimise for" filter

Cost, carbon, or both (a 50/50 blend of normalised cost and carbon).

## Features

### Must

1. **Setup.** Pick a sample household or configure your own: EV and charger,
   solar (kWp, roof direction, tilt), battery, appliances (washing machine,
   dryer, dishwasher, immersion, heat pump), county. Choose the optimise-for
   mode.
2. **3D house.** An interactive house showing the configured components (panels
   on the roof, EV and charger in the driveway, battery on the wall,
   appliances inside). Click an appliance to see its best window. Energy flows
   animate (sun → panels → house → EV/battery/grid).
3. **36-hour timeline.** A band coloured green → amber → red by grid carbon
   intensity, tariff bands overlaid (day, night, peak), the solar forecast, a
   "now" marker, and best windows glowing.
4. **Solar year view.** Monthly generation vs household use, self-use vs
   export, export earnings vs annual bill, and a running credit balance where
   summer surplus offsets winter bills.
5. **Ask WattWhen.** A chat that turns needs like "car at 80% by 8am Tuesday
   and two washes this week" into a schedule, using tools. The model never
   does the arithmetic: € and CO2 come from code.

### Should

- **Bill onboarding.** Upload a photo of an electricity bill. Vision extracts
  supplier, plan, unit rates, standing charge and kWh used, and nothing else
  (no name, address or account number). Demo with a sample bill found online,
  labelled as such.

### Could

- Nudges ("windy for the next 3 hours, grid 40% cleaner, run it now").
- Tariff comparison across suppliers.
- v2: a real 3D house modelled in Blender (for example with GPT-6 Astra),
  exported as glTF into react-three-fiber.

## Solar facts to get right

- Excess solar exports automatically through the inverter. The household is
  only paid if it's registered for its supplier's export tariff (Clean Export
  Guarantee). Most suppliers pay a flat rate per kWh; check supplier sites.
- With a flat export rate, *when* you export doesn't change €. What matters:
  self-use beats export (import costs more than export pays), so soak up
  midday excess with the EV or the immersion.
- Export carbon value does change by time: an exported kWh displaces more CO2
  when the grid is dirty. That matters with a battery.
- Whether export credit carries over between bills depends on the supplier.
  Model it as a tariff field.

## Facts vs AI

The UI always distinguishes:

- **Data** (EirGrid, Met Éireann, PVGIS, tariff table): with source and
  timestamp.
- **Estimates** (our CO2 forecast, synthetic household profiles, self-use
  assumptions): labelled as estimates.
- **AI suggestions** (chat answers, bill extraction, appliance explanations):
  labelled as AI.

## Demo script (3 minutes)

1. Who: "My mam always complains about the electricity bill." Open the general household.
2. The 3D house and the 36h timeline. Live EirGrid data, sourced and
   timestamped.
3. Click the washing machine and the immersion to see the best windows, and
   the € and CO2 saved vs her usual time. Flip optimise-for between cost and
   carbon and watch the windows move.
4. Switch on EV and solar. Ask: "Car needs 80% by 8am tomorrow." The plan
   picks tonight's windy night rate, with the reasoning.
5. Solar year view: summer credit paying winter bills.
6. Data used, and what's next (real tariffs from a bill photo, Blender house,
   nudges).

## Stack

Next.js 16 (App Router, TypeScript, Tailwind), react-three-fiber + drei,
Motion v14 (`motion/react`), OpenAI SDK, deployed on Vercel. Repo:
https://github.com/OpenAIBuildForIreland/wattwhen (public).
