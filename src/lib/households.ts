import { validateBillTariff } from "./bill";
import type { Appliance, Household } from "./types";
export const appliances: Appliance[] = [
  {
    id: "washer",
    name: "Washing machine",
    kW: 0.7,
    hours: 2,
    usualStart: "19:00",
    flexible: true,
  },
  {
    id: "dishwasher",
    name: "Dishwasher",
    kW: 0.6,
    hours: 2.5,
    usualStart: "19:00",
    flexible: true,
  },
  {
    id: "immersion",
    name: "Immersion",
    kW: 3,
    hours: 1,
    usualStart: "19:00",
    flexible: true,
  },
  {
    id: "dryer",
    name: "Tumble dryer",
    kW: 2.5,
    hours: 1.5,
    usualStart: "19:00",
    flexible: true,
  },
  {
    id: "heatpump",
    name: "Heat pump",
    kW: 2,
    hours: 3,
    usualStart: "19:00",
    flexible: true,
  },
  {
    id: "ev",
    name: "EV charging",
    kW: 7,
    hours: 4,
    usualStart: "19:00",
    flexible: true,
  },
];
export const households: Household[] = [
  {
    id: "mam",
    name: "Mam’s house",
    synthetic: true,
    county: "Dublin",
    lat: 53.35,
    lon: -6.25,
    annualKWh: 4200,
    appliances: appliances.slice(0, 3),
    tariffId: "sample-smart",
  },
  {
    id: "commuter",
    name: "EV commuter",
    synthetic: true,
    county: "Cork",
    lat: 51.9,
    lon: -8.47,
    annualKWh: 7200,
    ev: { batteryKWh: 60, chargerKW: 7 },
    appliances: [...appliances.slice(0, 3), appliances[5]],
    tariffId: "sample-smart",
  },
  {
    id: "solar",
    name: "Solar + EV + battery",
    synthetic: true,
    county: "Dublin",
    lat: 53.35,
    lon: -6.25,
    annualKWh: 7200,
    ev: { batteryKWh: 60, chargerKW: 7 },
    solar: { kWp: 4, aspect: 0, tilt: 35 },
    battery: { kWh: 5 },
    appliances: [...appliances.slice(0, 3), appliances[5]],
    tariffId: "sample-smart",
  },
];
export function readHousehold(value: unknown): Household {
  if (typeof value === "string") {
    const found = households.find((h) => h.id === value);
    if (!found) throw new Error("Unknown household");
    return structuredClone(found);
  }
  if (!value || typeof value !== "object")
    throw new Error("Choose a household");
  const h = value as Household;
  const finite = (v: number, min: number, max: number) =>
    typeof v === "number" && Number.isFinite(v) && v >= min && v <= max;
  if (
    !finite(h.lat, 51, 56) ||
    !finite(h.lon, -11, -5) ||
    !finite(h.annualKWh, 100, 40000) ||
    !Array.isArray(h.appliances) ||
    h.appliances.length > 6
  )
    throw new Error("Invalid household settings");
  if (
    h.solar &&
    (!finite(h.solar.kWp, 0.5, 20) ||
      !finite(h.solar.tilt, 0, 90) ||
      !finite(h.solar.aspect, -180, 180))
  )
    throw new Error("Invalid solar settings");
  if (
    h.ev &&
    (!finite(h.ev.batteryKWh, 10, 150) || !finite(h.ev.chargerKW, 1, 22))
  )
    throw new Error("Invalid EV settings");
  if (h.battery && !finite(h.battery.kWh, 1, 30))
    throw new Error("Invalid battery settings");
  if (h.billTariff) h.billTariff = validateBillTariff(h.billTariff);
  const ids = new Set<string>();
  h.appliances = h.appliances.map((a) => {
    const original = appliances.find((p) => p.id === a.id);
    if (!original || ids.has(a.id)) throw new Error("Invalid appliances");
    ids.add(a.id);
    return {
      ...original,
      ...(a.id === "ev" && h.ev ? { kW: h.ev.chargerKW } : {}),
    };
  });
  if (!h.ev) h.appliances = h.appliances.filter((a) => a.id !== "ev");
  return {
    ...h,
    synthetic: true,
    tariffId: "sample-smart",
    name: String(h.name).slice(0, 60),
    county: String(h.county).slice(0, 30),
  };
}
