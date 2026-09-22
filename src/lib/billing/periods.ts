import {
  assertCalendarDate,
  calendarDate,
  type CalendarDate,
  parseCalendarDate,
} from "@/lib/dates/calendar-date";
import { monthsForFrequency, type BillingFrequency } from "@/lib/domain/enums";

export type BillingPeriod = {
  start: CalendarDate;
  end: CalendarDate;
  scheduledDate: CalendarDate;
  months: 3 | 6 | 12;
  frequency: BillingFrequency;
  label: string;
};

export function getCurrentPeriod(
  onDate: CalendarDate,
  frequency: BillingFrequency,
): BillingPeriod {
  const parsed = parseCalendarDate(assertCalendarDate(onDate));
  if (!parsed) {
    throw new Error(`Data non valida: ${onDate}`);
  }

  if (frequency === "QUARTERLY") {
    const quarter = (Math.ceil(parsed.month / 3) || 1) as 1 | 2 | 3 | 4;
    return quarterlyPeriod(parsed.year, quarter);
  }

  if (frequency === "ANNUAL") {
    return annualPeriod(parsed.year);
  }

  const semester = parsed.month <= 6 ? 1 : 2;
  return semiannualPeriod(parsed.year, semester);
}

export function getNextPeriod(period: BillingPeriod): BillingPeriod {
  const start = parseCalendarDate(period.start);
  if (!start) {
    throw new Error(`Periodo non valido: ${period.start}`);
  }

  if (period.frequency === "QUARTERLY") {
    const nextMonth = start.month + 3;
    if (nextMonth > 12) {
      return getCurrentPeriod(calendarDate(start.year + 1, nextMonth - 12, 1), "QUARTERLY");
    }
    return getCurrentPeriod(calendarDate(start.year, nextMonth, 1), "QUARTERLY");
  }

  if (period.frequency === "ANNUAL") {
    return annualPeriod(start.year + 1);
  }

  if (start.month === 1) {
    return getCurrentPeriod(calendarDate(start.year, 7, 1), "SEMIANNUAL");
  }
  return getCurrentPeriod(calendarDate(start.year + 1, 1, 1), "SEMIANNUAL");
}

function annualPeriod(year: number): BillingPeriod {
  const start = calendarDate(year, 1, 1);
  return {
    start,
    end: calendarDate(year, 12, 31),
    scheduledDate: start,
    months: 12,
    frequency: "ANNUAL",
    label: `Anno ${year}`,
  };
}

export function iteratePeriods(
  from: BillingPeriod,
  count: number,
): BillingPeriod[] {
  const periods: BillingPeriod[] = [];
  let current = from;
  for (let i = 0; i < count; i += 1) {
    periods.push(current);
    current = getNextPeriod(current);
  }
  return periods;
}

export function formatPeriodRange(period: Pick<BillingPeriod, "start" | "end">): string {
  return `${period.start} → ${period.end}`;
}

function quarterlyPeriod(year: number, quarter: 1 | 2 | 3 | 4): BillingPeriod {
  const startMonth = ((quarter - 1) * 3 + 1) as 1 | 4 | 7 | 10;
  const endDayByQuarter: Record<1 | 2 | 3 | 4, { month: number; day: number }> = {
    1: { month: 3, day: 31 },
    2: { month: 6, day: 30 },
    3: { month: 9, day: 30 },
    4: { month: 12, day: 31 },
  };
  const end = endDayByQuarter[quarter];
  const start = calendarDate(year, startMonth, 1);

  return {
    start,
    end: calendarDate(year, end.month, end.day),
    scheduledDate: start,
    months: monthsForFrequency("QUARTERLY"),
    frequency: "QUARTERLY",
    label: `${quarter}° trim. ${year}`,
  };
}

function semiannualPeriod(year: number, semester: 1 | 2): BillingPeriod {
  if (semester === 1) {
    const start = calendarDate(year, 1, 1);
    return {
      start,
      end: calendarDate(year, 6, 30),
      scheduledDate: start,
      months: monthsForFrequency("SEMIANNUAL"),
      frequency: "SEMIANNUAL",
      label: `1° sem. ${year}`,
    };
  }

  const start = calendarDate(year, 7, 1);
  return {
    start,
    end: calendarDate(year, 12, 31),
    scheduledDate: start,
    months: monthsForFrequency("SEMIANNUAL"),
    frequency: "SEMIANNUAL",
    label: `2° sem. ${year}`,
  };
}
