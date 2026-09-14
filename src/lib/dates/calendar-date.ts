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
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  return assertCalendarDate(parts);
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
  return new Intl.DateTimeFormat("it-IT", {
    timeZone: TIMEZONE,
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}
