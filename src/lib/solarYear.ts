import { MONTH_WEIGHTS } from "./households";
import { pvgisMonthly } from "./sources/pvgis";
import { getTariff } from "./tariffs";
import type { Household } from "./types";

// Assumptions, labelled in the UI.
export const SELF_USE_NO_BATTERY = 0.35;
export const SELF_USE_WITH_BATTERY = 0.65;
const RATE_MIX = { day: 0.6, night: 0.3, peak: 0.1 };
const DAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
export const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export type SolarMonth = {
  month: string;
  genKWh: number;
  useKWh: number;
  selfUseKWh: number;
  exportKWh: number;
  importKWh: number;
  billEUR: number;
  exportEUR: number;
  netEUR: number; // bill − export credit
  balanceEUR: number; // running credit from April: positive = in credit
};

export async function solarYear(h: Household) {
  const solar = h.solar ?? { kWp: 4, aspect: 0, tilt: 35 };
  const pv = await pvgisMonthly(h.lat, h.lon, solar.kWp, solar.tilt, solar.aspect);
  const t = getTariff(h.tariffId);
  const unit = t.rates.day * RATE_MIX.day + t.rates.night * RATE_MIX.night + t.rates.peak * RATE_MIX.peak;
  const wsum = MONTH_WEIGHTS.reduce((s, w) => s + w, 0);
  const share = h.battery ? SELF_USE_WITH_BATTERY : SELF_USE_NO_BATTERY;

  const months: SolarMonth[] = MONTHS.map((month, i) => {
    const use = (h.annualKWh * MONTH_WEIGHTS[i]) / wsum;
    const gen = pv.monthlyKWh[i];
    const self = Math.min(gen * share, use);
    const exp = gen - self;
    const imp = use - self;
    const bill = imp * unit + DAYS[i] * t.standingPerDay;
    const credit = exp * t.exportRate;
    return {
      month,
      genKWh: Math.round(gen),
      useKWh: Math.round(use),
      selfUseKWh: Math.round(self),
      exportKWh: Math.round(exp),
      importKWh: Math.round(imp),
      billEUR: Math.round(bill),
      exportEUR: Math.round(credit),
      netEUR: Math.round(bill - credit),
      balanceEUR: 0,
    };
  });

  // Running balance starting in April, the way a summer surplus carries into winter.
  let bal = 0;
  for (let k = 0; k < 12; k++) {
    const m = months[(k + 3) % 12];
    bal -= m.netEUR;
    m.balanceEUR = Math.round(bal);
  }

  const noSolarBill = Math.round(h.annualKWh * unit + 365 * t.standingPerDay);
  const net = months.reduce((s, m) => s + m.netEUR, 0);
  return {
    months,
    totals: {
      genKWh: Math.round(pv.annualKWh),
      exportKWh: months.reduce((s, m) => s + m.exportKWh, 0),
      exportEUR: months.reduce((s, m) => s + m.exportEUR, 0),
      billEUR: months.reduce((s, m) => s + m.billEUR, 0),
      netEUR: net,
      noSolarBillEUR: noSolarBill,
      savedEUR: noSolarBill - net,
    },
    assumptions: { selfUseShare: share, unitRate: +unit.toFixed(3), tariffSample: t.sample },
    source: { name: "PVGIS · EU JRC", url: "https://re.jrc.ec.europa.eu/pvg_tools/en/", usedSample: pv.usedSample },
  };
}
