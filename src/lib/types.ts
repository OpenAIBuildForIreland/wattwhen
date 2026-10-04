export type Mode = "cost" | "carbon" | "both";
export type Band = "day" | "night" | "peak" | "boost";

export type Slot = {
  start: string; // ISO, 30-minute slot start
  co2: number | null; // gCO2/kWh
  co2Estimated: boolean;
  windMW: number | null;
  band: Band;
  price: number; // €/kWh import
  solarKW: number | null; // per 1 kWp, multiply by system size
  past: boolean;
};

export type SourceMeta = {
  name: string;
  url: string;
  fetchedAt: string;
  usedSample: boolean;
};

export type Timeline = {
  slots: Slot[];
  now: string;
  fit: { a: number; b: number; r2: number; n: number };
  sources: SourceMeta[];
};

export type Appliance = {
  id: string;
  name: string;
  kW: number;
  hours: number;
  usualStart: string; // "HH:MM" local
  kind: "washer" | "dryer" | "dishwasher" | "immersion" | "ev" | "heatpump";
};

export type Household = {
  id: string;
  name: string;
  blurb: string;
  synthetic: true;
  county: string;
  lat: number;
  lon: number;
  annualKWh: number;
  ev?: { batteryKWh: number; chargerKW: number };
  solar?: { kWp: number; aspect: number; tilt: number };
  battery?: { kWh: number };
  appliances: Appliance[];
  tariffId: string;
};

export type Window = {
  applianceId: string;
  start: string;
  end: string;
  costEUR: number;
  co2g: number;
  usual: { start: string; costEUR: number; co2g: number };
  savedEUR: number;
  savedCO2g: number;
  usesEstimate: boolean;
  reason: string;
};

export type Tariff = {
  id: string;
  supplier: string;
  plan: string;
  rates: Record<Band, number>;
  bands: { band: Band; from: string; to: string }[]; // local "HH:MM", checked in order
  standingPerDay: number;
  exportRate: number;
  source: string;
  checkedOn: string;
  sample: boolean;
};
