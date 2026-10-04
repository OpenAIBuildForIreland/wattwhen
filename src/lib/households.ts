import type { Appliance, Household } from "./types";

// Synthetic households. There is no real smart-meter data in this app.
const homeAppliances: Appliance[] = [
  { id: "washer", name: "Washing machine", kW: 2, hours: 2, usualStart: "19:00", kind: "washer" },
  { id: "dryer", name: "Tumble dryer", kW: 2.5, hours: 1.5, usualStart: "20:00", kind: "dryer" },
  { id: "dishwasher", name: "Dishwasher", kW: 1.5, hours: 2, usualStart: "21:00", kind: "dishwasher" },
  { id: "immersion", name: "Immersion", kW: 3, hours: 1.5, usualStart: "18:00", kind: "immersion" },
];

const evCharge: Appliance = {
  id: "ev",
  name: "EV charge (40 kWh)",
  kW: 7.2,
  hours: 5.5,
  usualStart: "18:30",
  kind: "ev",
};

export const HOUSEHOLDS: Household[] = [
  {
    id: "mam",
    name: "Mam's house",
    blurb: "Semi-d in Dublin. No solar, no EV, and the bill keeps going up.",
    synthetic: true,
    county: "Dublin",
    lat: 53.35,
    lon: -6.25,
    annualKWh: 4200,
    appliances: homeAppliances,
    tariffId: "smart-standard",
  },
  {
    id: "ev",
    name: "EV commuter",
    blurb: "Charges the car most evenings after work.",
    synthetic: true,
    county: "Kildare",
    lat: 53.16,
    lon: -6.91,
    annualKWh: 6500,
    ev: { batteryKWh: 60, chargerKW: 7.2 },
    appliances: [...homeAppliances, evCharge],
    tariffId: "smart-ev",
  },
  {
    id: "solar",
    name: "Solar + EV + battery",
    blurb: "6 kWp south-facing panels, 5 kWh battery and an EV. Sells to the grid all summer.",
    synthetic: true,
    county: "Cork",
    lat: 51.9,
    lon: -8.47,
    annualKWh: 7000,
    ev: { batteryKWh: 60, chargerKW: 7.2 },
    solar: { kWp: 6, aspect: 0, tilt: 35 },
    battery: { kWh: 5 },
    appliances: [...homeAppliances, evCharge],
    tariffId: "smart-ev",
  },
];

export function getHousehold(id: string): Household {
  return HOUSEHOLDS.find((h) => h.id === id) ?? HOUSEHOLDS[0];
}

// Irish homes use more in winter. Weights Jan..Dec, normalised in use.
export const MONTH_WEIGHTS = [1.2, 1.1, 1.05, 0.95, 0.9, 0.85, 0.85, 0.85, 0.9, 1.0, 1.1, 1.25];
