# Data sources

All checked live on 4 Oct 2026, keyless. Dated samples for offline fallback
are in `src/data/samples/`. Every live fetch must fall back to its sample and
tell the UI it did.

## EirGrid Smart Grid Dashboard (grid carbon, wind, demand)

```
GET https://www.smartgriddashboard.com/DashboardService.svc/data
    ?area=<area>&region=ALL&datefrom=04-Oct-2026+00:00&dateto=05-Oct-2026+23:59
```

Response: `{ ErrorMessage, LastUpdated, Rows: [{ EffectiveTime: "04-Oct-2026 13:15:00", FieldName, Region, Value }] }`.
15-minute resolution. Future rows have `Value: null` for actuals. Times are Irish local time.

| area | What | Horizon |
|------|------|---------|
| `co2intensity` | Grid carbon intensity, gCO2/kWh | actuals only, up to now |
| `windforecast` | Wind generation forecast, MW | about 36h ahead |
| `demandactual` | System demand, MW | actuals only |
| `SnspAll` | Renewables share (SNSP), % | actuals only |
| `fuelmix` | Current fuel mix | snapshot |

Quirks:

- **There is no CO2 forecast.** We estimate one: fit `co2 ≈ a + b·wind` on the
  overlapping past slots (actual CO2 vs wind forecast for the same
  timestamps), then apply it to future wind forecast slots. Label it an
  estimate.
- **Unreliable.** It often returns an HTML "Service Unavailable" page under
  rapid calls. Retry with backoff, cache for about 10 minutes, fall back to
  samples. `demandforecast`, `windactual` and `generationactual` returned 503
  during testing.
- On 4 Oct, CO2 ranged 108–207 g/kWh and SNSP 47–75%.

## Met Éireann open forecast API (solar radiation, weather)

```
GET http://openaccess.pf.api.met.ie/metno-wdb2ts/locationforecast?lat=53.349;long=-6.247
```

XML. Hourly `<time datatype="forecast" from=.. to=..>` blocks, about 48h of
HARMONIE then ECMWF to 10 days. Point blocks (from == to) contain
`<globalRadiation value=".." unit="W/m^2"/>`, `<cloudiness percent>`,
`<temperature>`. Interval blocks contain `<precipitation>`. Times are UTC.

Solar estimate per hour: `kW ≈ kWp × globalRadiation / 1000 × 0.8` (0.8 is a
system performance ratio; label it an assumption). Fallback: Open-Meteo
`https://api.open-meteo.com/v1/forecast?latitude=..&longitude=..&hourly=shortwave_radiation`.

## PVGIS, EU Joint Research Centre (annual solar by month)

```
GET https://re.jrc.ec.europa.eu/api/v5_3/PVcalc?lat=53.35&lon=-6.25&peakpower=4&loss=14&angle=35&aspect=0&outputformat=json
```

`aspect`: 0 = south, -90 = east, 90 = west. Monthly output is in
`outputs.monthly.fixed[].E_m` (kWh); the annual total is
`outputs.totals.fixed.E_y`.

4 kWp in Dublin, south-facing at 35°: 3,889 kWh/yr. By month: 150, 212, 350,
441, 499, 469, 450, 409, 346, 253, 174, 135.

## Tariffs

No open tariff API. `src/lib/tariffs.ts` holds a hand-built table. Each entry
records supplier, plan, day/night/peak rates (€/kWh), standing charge, export
rate, source URL and date checked. Until a teammate fills in real rates, the
entries are marked `sample: true` and the UI shows that.

Standard Irish smart time-of-use bands (verify): day 08:00–23:00, night
23:00–08:00, peak 17:00–19:00.

## Household profiles

There's no smart-meter data (personal, behind an ESB Networks account).
Households are synthetic, built from appliance lists and typical usage
patterns, and labelled synthetic in the UI.

## Other live feeds found (not used yet)

- TII road cameras: 247 live JPEGs via `POST https://traffic.tii.ie/api/graphql`
  (`mapFeaturesQuery`, layer `normalCameras`).
- OPW water levels: `https://waterlevel.ie/geojson/latest/`
- Met Éireann warnings: `https://www.met.ie/Open_Data/json/warning_IRELAND.json`
