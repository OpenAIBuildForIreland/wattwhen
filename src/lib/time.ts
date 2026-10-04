export const ZONE = "Europe/Dublin";
export const HALF_HOUR = 1_800_000;
export const SAMPLE_NOW = "2026-10-04T13:00:00.000Z";
export function localParts(date: Date | string) {
  return Object.fromEntries(new Intl.DateTimeFormat("en-GB", { timeZone: ZONE, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" }).formatToParts(new Date(date)).map(p => [p.type, p.value]));
}
export function irishToISO(text: string) {
  const m = text.match(/(\d{2})-([A-Za-z]{3})-(\d{4}) (\d{2}):(\d{2})(?::(\d{2}))?/);
  if (!m) throw new Error("Invalid Irish timestamp");
  const month = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"].indexOf(m[2]);
  const target = Date.UTC(+m[3], month, +m[1], +m[4], +m[5], +(m[6] || 0));
  let utc = target;
  for (let i = 0; i < 3; i++) {
    const p = localParts(new Date(utc));
    utc += target - Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
  }
  return new Date(utc).toISOString();
}
export function eirDate(date: Date) { return new Intl.DateTimeFormat("en-GB", { timeZone: ZONE, day: "2-digit", month: "short", year: "numeric" }).format(date).replaceAll(" ", "-"); }
export function timeLabel(date: string) { return new Intl.DateTimeFormat("en-IE", { timeZone: ZONE, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(date)); }
export function dayLabel(date: string) { return new Intl.DateTimeFormat("en-IE", { timeZone: ZONE, weekday: "short", day: "numeric", month: "short" }).format(new Date(date)); }
