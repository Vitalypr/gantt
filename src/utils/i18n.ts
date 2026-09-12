import type { ChartDirection } from '@/types/gantt';

/**
 * Locale for a chart direction.
 *
 * One user-facing control, not two. The request is "RTL mode shows Hebrew", so direction
 * implies language — but the mapping lives here, in one named function, so adding a separate
 * language picker later is a change to this file and nothing else.
 */
export function localeForDirection(direction: ChartDirection): string {
  return direction === 'rtl' ? 'he' : 'en';
}

export function isRtlDirection(direction: ChartDirection): boolean {
  return direction === 'rtl';
}

// `Intl` allocates a formatter per call otherwise, and headers format hundreds of labels on
// every zoom change.
const shortMonthCache = new Map<string, Intl.DateTimeFormat>();
const longMonthCache = new Map<string, Intl.DateTimeFormat>();

function formatter(cache: Map<string, Intl.DateTimeFormat>, locale: string, month: 'short' | 'long') {
  let f = cache.get(locale);
  if (!f) {
    // `calendar: 'gregory'` is PINNED. The chart's axis is Gregorian months and weeks, so the
    // labels must name Gregorian months - in Hebrew that is "נובמבר", not a Hebrew-calendar
    // month like "חשוון". `he` happens to resolve to gregory today, but a locale that defaults
    // otherwise would silently relabel the whole axis.
    f = new Intl.DateTimeFormat(locale, { month, calendar: 'gregory' });
    cache.set(locale, f);
  }
  return f;
}

/** Abbreviated month name, e.g. `Jan` / `ינו׳`. `month` is 1-12. */
export function monthShort(locale: string, month: number): string {
  return formatter(shortMonthCache, locale, 'short').format(new Date(2020, month - 1, 1));
}

/** Full month name, e.g. `January` / `ינואר`. `month` is 1-12. */
export function monthLong(locale: string, month: number): string {
  return formatter(longMonthCache, locale, 'long').format(new Date(2020, month - 1, 1));
}

/**
 * The month label that fits.
 *
 * One degradation ladder - full name, abbreviation, number, blank - instead of an inline
 * width ternary at each call site. The header had two of those and they disagreed, so the
 * same column width showed different detail in months mode and weeks mode.
 */
export function monthLabel(locale: string, month: number, width: number): string {
  if (width >= 64) return monthLong(locale, month);
  if (width >= 34) return monthShort(locale, month);
  if (width >= 14) return String(month);
  return '';
}

/**
 * Quarter label. `Intl` has no quarter formatter with usable browser support, so this is an
 * explicit table rather than a silent fallback to English.
 */
export function quarterLabel(locale: string, quarter: number, year: number): string {
  const q = locale.startsWith('he') ? `רבעון ${quarter + 1}` : `Q${quarter + 1}`;
  return `${q} ${year}`;
}

/** Short quarter label, for when the column is too narrow for the year. */
export function quarterShort(locale: string, quarter: number): string {
  return locale.startsWith('he') ? `ר${quarter + 1}` : `Q${quarter + 1}`;
}

/** The quarter label that fits, same ladder as months. */
export function quarterLabelForWidth(locale: string, quarter: number, year: number, width: number): string {
  if (width >= 56) return quarterLabel(locale, quarter, year);
  if (width >= 24) return quarterShort(locale, quarter);
  return '';
}

/** Calendar-week label, e.g. `W12` / `ש12`. */
export function weekLabel(locale: string, weekNumber: number): string {
  return locale.startsWith('he') ? `ש${weekNumber}` : `W${weekNumber}`;
}

/** The week label that fits. */
export function weekLabelForWidth(locale: string, weekNumber: number, width: number): string {
  if (width >= 30) return weekLabel(locale, weekNumber);
  if (width >= 14) return String(weekNumber);
  return '';
}
