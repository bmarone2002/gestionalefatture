/**
 * Date amministrative: giorno di calendario in Europe/Rome, senza ora.
 * Formato canonico: YYYY-MM-DD. Mai usare getMonth()/getDate() locali.
 */

export const TIMEZONE = "Europe/Rome";

export type CalendarDate = string;

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isCalendarDate(value: string): value is CalendarDate {
  if (!DATE_RE.test(value)) {
    return false;
  }
  const parsed = parseCalendarDate(value);
  if (!parsed) {
    return false;
  }
  const utc = new Date(Date.UTC(parsed.year, parsed.month - 1, parsed.day));
  return (
    utc.getUTCFullYear() === parsed.year &&
    utc.getUTCMonth() === parsed.month - 1 &&
    utc.getUTCDate() === parsed.day
  );
}

export function assertCalendarDate(value: string): CalendarDate {
  if (!isCalendarDate(value)) {
    throw new Error(`Data non valida: ${value}`);
  }
  return value;
}

export function parseCalendarDate(value: CalendarDate): {
  year: number;
  month: number;
  day: number;
} | null {
  const match = DATE_RE.exec(value);
  if (!match) {
    return null;
  }
  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
  };
}

export function calendarDate(year: number, month: number, day: number): CalendarDate {
  const value = `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  return assertCalendarDate(value);
}

/** Interpreta un Date Prisma @db.Date (mezzanotte UTC). */
export function fromUtcDate(date: Date): CalendarDate {
  return calendarDate(
    date.getUTCFullYear(),
    date.getUTCMonth() + 1,
    date.getUTCDate(),
  );
}

/** Converte una data amministrativa in Date UTC mezzanotte, per Prisma @db.Date. */
export function toUtcDate(date: CalendarDate): Date {
  const parsed = parseCalendarDate(assertCalendarDate(date));
  if (!parsed) {
    throw new Error(`Data non valida: ${date}`);
  }
  return new Date(Date.UTC(parsed.year, parsed.month - 1, parsed.day));
}

export function todayRome(now: Date = new Date()): CalendarDate {
  try {
    return calendarDateFromTimeZone(now, TIMEZONE);
  } catch (error) {
    console.warn("Intl non calcola Europe/Rome, uso CET/CEST.", error);
    return calendarDateFromRomeOffset(now);
  }
}

function calendarDateFromTimeZone(now: Date, timeZone: string): CalendarDate {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);

  const year = digitsOf(parts, "year");
  const month = digitsOf(parts, "month")?.padStart(2, "0");
  const day = digitsOf(parts, "day")?.padStart(2, "0");
  if (!year || !month || !day) {
    throw new Error("Data non calcolabile da Intl");
  }
  return assertCalendarDate(`${year}-${month}-${day}`);
}

/**
 * Fallback senza database TZ ICU: CET UTC+1 / CEST UTC+2 (regole UE).
 * Utile su immagini Node con ICU ridotta.
 */
export function calendarDateFromRomeOffset(now: Date): CalendarDate {
  const offsetHours = isEuSummerTime(now) ? 2 : 1;
  const shifted = new Date(now.getTime() + offsetHours * 3_600_000);
  return calendarDate(
    shifted.getUTCFullYear(),
    shifted.getUTCMonth() + 1,
    shifted.getUTCDate(),
  );
}

function digitsOf(
  parts: Intl.DateTimeFormatPart[],
  type: Intl.DateTimeFormatPartTypes,
): string | undefined {
  const raw = parts.find((part) => part.type === type)?.value;
  if (!raw) {
    return undefined;
  }
  const digits = raw.replace(/\D/g, "");
  return digits || undefined;
}

/** Ora legale UE: ultima domenica di marzo 01:00 UTC → ultima domenica di ottobre 01:00 UTC. */
function isEuSummerTime(now: Date): boolean {
  const year = now.getUTCFullYear();
  const start = lastSundayUtc(year, 3, 1);
  const end = lastSundayUtc(year, 10, 1);
  return now.getTime() >= start.getTime() && now.getTime() < end.getTime();
}

function lastSundayUtc(year: number, month: number, hourUtc: number): Date {
  const lastDayOfMonth = new Date(Date.UTC(year, month, 0, hourUtc, 0, 0, 0));
  lastDayOfMonth.setUTCDate(lastDayOfMonth.getUTCDate() - lastDayOfMonth.getUTCDay());
  return lastDayOfMonth;
}

export function formatItalianDate(date: CalendarDate): string {
  const parsed = parseCalendarDate(assertCalendarDate(date));
  if (!parsed) {
    throw new Error(`Data non valida: ${date}`);
  }
  return `${String(parsed.day).padStart(2, "0")}/${String(parsed.month).padStart(2, "0")}/${parsed.year}`;
}

export function compareCalendarDates(a: CalendarDate, b: CalendarDate): number {
  if (a === b) return 0;
  return a < b ? -1 : 1;
}

export function addCalendarMonths(date: CalendarDate, months: number): CalendarDate {
  const parsed = parseCalendarDate(assertCalendarDate(date));
  if (!parsed) {
    throw new Error(`Data non valida: ${date}`);
  }
  const utc = new Date(Date.UTC(parsed.year, parsed.month - 1 + months, parsed.day));
  return fromUtcDate(utc);
}

export function diffCalendarDays(from: CalendarDate, to: CalendarDate): number {
  const ms = toUtcDate(to).getTime() - toUtcDate(from).getTime();
  return Math.round(ms / 86_400_000);
}

export function minCalendarDate(a: CalendarDate, b: CalendarDate): CalendarDate {
  return a <= b ? a : b;
}

export function maxCalendarDate(a: CalendarDate, b: CalendarDate): CalendarDate {
  return a >= b ? a : b;
}

export function formatItalianDateTime(date: Date): string {
  try {
    return new Intl.DateTimeFormat("it-IT", {
      timeZone: TIMEZONE,
      dateStyle: "short",
      timeStyle: "short",
    }).format(date);
  } catch {
    return new Intl.DateTimeFormat("it-IT", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(date);
  }
}
