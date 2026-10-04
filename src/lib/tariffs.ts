import type { Household } from "./types";
import { localParts } from "./time";
export const tariff = {
  id: "sample-smart",
  supplier: "Illustrative smart tariff",
  sample: true,
  checkedOn: "2026-10-04",
  sourceURL: "https://www.cru.ie/consumer-information/switching-supplier/",
  rates: { day: 0.32, night: 0.16, peak: 0.4 },
  standingPerDay: 0.65,
  exportRate: 0.19,
  creditCarries: true,
};
export function tariffFor(h?: Household) {
  return h?.billTariff
    ? {
        ...tariff,
        supplier: h.billTariff.supplier,
        rates: {
          day: h.billTariff.day,
          night: h.billTariff.night,
          peak: h.billTariff.peak,
        },
        standingPerDay: h.billTariff.standingPerDay,
      }
    : tariff;
}
export function tariffAt(time: string, selected = tariff) {
  const hour = +localParts(time).hour;
  const band: "day" | "night" | "peak" =
    hour < 8 || hour >= 23 ? "night" : hour >= 17 && hour < 19 ? "peak" : "day";
  return { band, price: selected.rates[band] };
}
