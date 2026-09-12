import { addDays, daysBetween } from '@/utils/timeline';

/**
 * Israeli public holidays - the days that are actually days off.
 *
 * Deliberately NOT every entry in the Hebrew calendar: Chol HaMoed, Yom HaZikaron, Yom
 * HaShoah, Tu BiShvat, Purim, Lag BaOmer and the fasts are working days in Israel, and
 * shading them would tell a planner the opposite of the truth.
 *
 * Dates come from the platform's own Hebrew calendar via `Intl`, not a hardcoded table, so
 * they stay correct for any year and handle leap years (Adar I / Adar II) without special
 * cases. Hebrew days begin at sunset; a planning chart marks the civil day off, which is
 * what this returns.
 */
export type Holiday = {
  /** Inclusive first civil day. */
  start: Date;
  /** Inclusive last civil day. */
  end: Date;
  name: string;
  nameHe: string;
};

type HolidayRule = { month: string; day: number; name: string; nameHe: string };

/** Keyed by the English Hebrew-calendar month name `Intl` reports. */
const HOLIDAY_RULES: HolidayRule[] = [
  { month: 'Tishri', day: 1, name: 'Rosh Hashanah', nameHe: 'ראש השנה' },
  { month: 'Tishri', day: 2, name: 'Rosh Hashanah', nameHe: 'ראש השנה' },
  { month: 'Tishri', day: 10, name: 'Yom Kippur', nameHe: 'יום כיפור' },
  { month: 'Tishri', day: 15, name: 'Sukkot', nameHe: 'סוכות' },
  { month: 'Tishri', day: 22, name: 'Simchat Torah', nameHe: 'שמחת תורה' },
  { month: 'Nisan', day: 15, name: 'Passover', nameHe: 'פסח' },
  { month: 'Nisan', day: 21, name: 'Seventh of Passover', nameHe: 'שביעי של פסח' },
  { month: 'Sivan', day: 6, name: 'Shavuot', nameHe: 'שבועות' },
];

const INDEPENDENCE = { month: 'Iyar', day: 5, name: 'Independence Day', nameHe: 'יום העצמאות' };

let hebrewFormatter: Intl.DateTimeFormat | null = null;
function hebrewParts(date: Date): { month: string; day: number } {
  hebrewFormatter ??= new Intl.DateTimeFormat('en-u-ca-hebrew', { month: 'long', day: 'numeric' });
  const parts = hebrewFormatter.formatToParts(date);
  const month = parts.find((p) => p.type === 'month')?.value ?? '';
  const day = Number(parts.find((p) => p.type === 'day')?.value ?? '0');
  return { month, day };
}

/**
 * Independence Day is moved so it never abuts Shabbat.
 *
 * 5 Iyar on Friday or Saturday moves earlier to the preceding Thursday; on Monday it moves
 * forward to Tuesday. Without this the chart marks a day that is not actually a day off.
 */
function observedIndependenceDay(nominal: Date): Date {
  switch (nominal.getDay()) {
    case 5: return addDays(nominal, -1); // Friday   -> Thursday
    case 6: return addDays(nominal, -2); // Saturday -> Thursday
    case 1: return addDays(nominal, 1);  // Monday   -> Tuesday
    default: return nominal;
  }
}

/**
 * Holidays touching the inclusive civil-date range, with consecutive days merged into one
 * span (Rosh Hashanah is two days and must shade as one band, not two abutting ones).
 */
export function getHolidays(rangeStart: Date, rangeEnd: Date): Holiday[] {
  const total = daysBetween(rangeStart, rangeEnd);
  if (total < 0) return [];

  type Hit = { date: Date; name: string; nameHe: string };
  const hits: Hit[] = [];

  for (let i = 0; i <= total; i++) {
    const date = addDays(rangeStart, i);
    const { month, day } = hebrewParts(date);

    const rule = HOLIDAY_RULES.find((r) => r.month === month && r.day === day);
    if (rule) hits.push({ date, name: rule.name, nameHe: rule.nameHe });

    if (month === INDEPENDENCE.month && day === INDEPENDENCE.day) {
      const observed = observedIndependenceDay(date);
      // The observed day can fall outside the scanned window at a range edge.
      if (daysBetween(rangeStart, observed) >= 0 && daysBetween(observed, rangeEnd) >= 0) {
        hits.push({ date: observed, name: INDEPENDENCE.name, nameHe: INDEPENDENCE.nameHe });
      }
    }
  }

  hits.sort((a, b) => a.date.getTime() - b.date.getTime());

  const merged: Holiday[] = [];
  for (const hit of hits) {
    const last = merged[merged.length - 1];
    // Merge only a same-named run of consecutive days, so Sukkot and Simchat Torah stay
    // distinct even when the calendar puts other observances between them.
    if (last && last.name === hit.name && daysBetween(last.end, hit.date) === 1) {
      last.end = hit.date;
    } else if (!last || daysBetween(last.end, hit.date) !== 0) {
      merged.push({ start: hit.date, end: hit.date, name: hit.name, nameHe: hit.nameHe });
    }
  }
  return merged;
}
