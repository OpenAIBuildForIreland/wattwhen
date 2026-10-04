export type Mode = "cost" | "carbon" | "both";
export type Slot = { start: string; co2: number; co2Estimated: boolean; windMW: number; windExtrapolated?: boolean; band: "day" | "night" | "peak"; price: number; solarKW?: number };
export type Appliance = { id: string; name: string; kW: number; hours: number; usualStart?: string; flexible: boolean };
export type Household = { id: string; name: string; synthetic: true; county: string; lat: number; lon: number; annualKWh: number; ev?: { batteryKWh: number; chargerKW: number }; solar?: { kWp: number; aspect: number; tilt: number }; battery?: { kWh: number }; appliances: Appliance[]; tariffId: string };
export type Window = { applianceId: string; start: string; end: string; costEUR: number; co2g: number; vsUsual: { savedEUR: number; savedCO2g: number }; reason: string; usualStart: string };
export type Source = { name: string; url: string; fetchedAt: string; updatedAt: string; usedSample: boolean; note?: string };
export type Grid = { slots: Slot[]; meta: { sources: Source[]; fetchedAt: string; usedSample: boolean; anchor: string; regression: { a: number; b: number; pairs: number }; note: string } };
export type Series = { points: { time: string; value: number }[]; source: Source };
