export type BillFields = {
  supplier: string | null;
  plan: string | null;
  day: number | null;
  night: number | null;
  peak: number | null;
  standingPerDay: number | null;
  kWh: number | null;
};
export type BillTariff = {
  supplier: string;
  plan: string;
  day: number;
  night: number;
  peak: number;
  standingPerDay: number;
};
export const demoBill: BillFields = {
  supplier: "WattWhen Demo Energy",
  plan: "Illustrative Smart Home",
  day: 0.34,
  night: 0.15,
  peak: 0.42,
  standingPerDay: 0.7,
  kWh: 350,
};
export function validateBillTariff(value: unknown): BillTariff {
  if (!value || typeof value !== "object")
    throw new Error("Review the bill rates first");
  const b = value as BillTariff;
  for (const field of ["day", "night", "peak", "standingPerDay"] as const) {
    if (
      typeof b[field] !== "number" ||
      !Number.isFinite(b[field]) ||
      b[field] < 0 ||
      b[field] > (field === "standingPerDay" ? 5 : 2)
    )
      throw new Error("Bill rates must be valid euro amounts");
  }
  return {
    supplier: String(b.supplier ?? "Sample bill").slice(0, 80),
    plan: String(b.plan ?? "Reviewed sample").slice(0, 80),
    day: b.day,
    night: b.night,
    peak: b.peak,
    standingPerDay: b.standingPerDay,
  };
}
