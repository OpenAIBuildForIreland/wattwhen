const TZ = "Europe/Dublin";
const MONTHS: Record<string, number> = {
  Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
};

const partsFmt = new Intl.DateTimeFormat("en-GB", {
  timeZone: TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

function dublinParts(d: Date) {
  const p = Object.fromEntries(partsFmt.formatToParts(d).map((x) => [x.type, x.value]));
  return { y: +p.year, mo: +p.month - 1, d: +p.day, h: +p.hour, mi: +p.minute };
}

// Minutes Dublin is ahead of UTC at this instant (0 in winter, 60 in summer).
export function dublinOffsetMinutes(d: Date): number {
  const p = dublinParts(d);
  const asUtc = Date.UTC(p.y, p.mo, p.d, p.h, p.mi);
  return Math.round((asUtc - Math.floor(d.getTime() / 60000) * 60000) / 60000);
}

// "04-Oct-2026 13:15:00" in Irish local time → Date
export function parseEirgridTime(s: string): Date {
  const [date, time] = s.split(" ");
  const [dd, mon, yyyy] = date.split("-");
  const [hh, mm] = time.split(":").map(Number);
  const guess = new Date(Date.UTC(+yyyy, MONTHS[mon], +dd, hh, mm));
  return new Date(guess.getTime() - dublinOffsetMinutes(guess) * 60000);
}

// Date → "04-Oct-2026+00:00" for EirGrid query strings (local date, midnight)
export function eirgridDay(d: Date): string {
  const p = dublinParts(d);
  const mon = Object.keys(MONTHS)[p.mo];
  return `${String(p.d).padStart(2, "0")}-${mon}-${p.y}+00:00`;
}

export function localMinutes(d: Date): number {
  const p = dublinParts(d);
  return p.h * 60 + p.mi;
}

export function localHHMM(d: Date): string {
  const p = dublinParts(d);
  return `${String(p.h).padStart(2, "0")}:${String(p.mi).padStart(2, "0")}`;
}

export const SLOT_MS = 30 * 60 * 1000;

export function floorToSlot(d: Date): Date {
  return new Date(Math.floor(d.getTime() / SLOT_MS) * SLOT_MS);
}
