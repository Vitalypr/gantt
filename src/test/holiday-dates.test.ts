import { describe, it, expect } from 'vitest';
import { getHolidays } from '@/utils/holidays';
import { daysBetween, dateToUnitOffset } from '@/utils/timeline';

/**
 * Every holiday must begin and end on its real civil day — only the statutory days off
 * matter here, and each one has to land exactly on the Hebrew date it is defined by.
 *
 * The checks below are deliberately NOT "does Intl agree with Intl". They assert the things
 * that can actually go wrong around it: the length of each span, that a span's first and last
 * civil day really are the Hebrew days claimed, that nothing outside the rule set gets shaded,
 * and that Independence Day is moved off Shabbat.
 */

const hebrew = new Intl.DateTimeFormat('en-u-ca-hebrew', { month: 'long', day: 'numeric' });
const hebrewOf = (d: Date) => {
  const parts = hebrew.formatToParts(d);
  return {
    month: parts.find((p) => p.type === 'month')?.value ?? '',
    day: Number(parts.find((p) => p.type === 'day')?.value ?? '0'),
  };
};

/** The nine statutory days off, by the Hebrew date each begins on. */
const EXPECTED = [
  { name: 'Rosh Hashanah', month: 'Tishri', day: 1, days: 2 },
  { name: 'Yom Kippur', month: 'Tishri', day: 10, days: 1 },
  { name: 'Sukkot', month: 'Tishri', day: 15, days: 1 },
  { name: 'Simchat Torah', month: 'Tishri', day: 22, days: 1 },
  { name: 'Passover', month: 'Nisan', day: 15, days: 1 },
  { name: 'Seventh of Passover', month: 'Nisan', day: 21, days: 1 },
  { name: 'Shavuot', month: 'Sivan', day: 6, days: 1 },
];

const YEARS = [2026, 2027, 2028];
const all = YEARS.flatMap((y) => getHolidays(new Date(y, 0, 1), new Date(y, 11, 31)));

describe('each holiday spans its real days', () => {
  it.each(EXPECTED)('$name is $days day(s) and starts on $day $month', (spec) => {
    const found = all.filter((h) => h.name === spec.name);
    expect(found.length, `${spec.name} missing from ${YEARS.join('/')}`).toBeGreaterThan(0);

    for (const h of found) {
      const span = daysBetween(h.start, h.end) + 1;
      expect(span, `${spec.name} on ${h.start.toDateString()} spans ${span} days`).toBe(spec.days);

      const startHeb = hebrewOf(h.start);
      expect(startHeb.month, `${spec.name} starts in ${startHeb.month}`).toBe(spec.month);
      expect(startHeb.day, `${spec.name} starts on ${startHeb.day} ${startHeb.month}`)
        .toBe(spec.day);

      // The last civil day must be the last Hebrew day of the span, not one past it.
      const endHeb = hebrewOf(h.end);
      expect(endHeb.day, `${spec.name} ends on ${endHeb.day} ${endHeb.month}`)
        .toBe(spec.day + spec.days - 1);
    }
  });

  it('shades nothing outside the rule set', () => {
    const allowed = new Set(EXPECTED.map((e) => `${e.month} ${e.day}`));
    for (const h of all) {
      if (h.name === 'Independence Day') continue; // moved off its nominal date on purpose
      const heb = hebrewOf(h.start);
      expect(allowed.has(`${heb.month} ${heb.day}`), `${h.name} shaded ${heb.day} ${heb.month}`)
        .toBe(true);
    }
  });

  it('never emits a zero or negative span', () => {
    for (const h of all) {
      expect(daysBetween(h.start, h.end), `${h.name} on ${h.start.toDateString()}`)
        .toBeGreaterThanOrEqual(0);
    }
  });

  it('never overlaps two holidays on the same day', () => {
    const claimed = new Map<string, string>();
    for (const h of all) {
      for (let i = 0; i <= daysBetween(h.start, h.end); i++) {
        const d = new Date(h.start);
        d.setDate(d.getDate() + i);
        const key = d.toDateString();
        expect(claimed.has(key), `${key} claimed by both ${claimed.get(key)} and ${h.name}`)
          .toBe(false);
        claimed.set(key, h.name);
      }
    }
  });
});

describe('Independence Day is a real day off', () => {
  const independence = all.filter((h) => h.name === 'Independence Day');

  it('appears once a year', () => {
    expect(independence).toHaveLength(YEARS.length);
  });

  it('never lands on a Friday or a Saturday', () => {
    for (const h of independence) {
      const day = h.start.getDay();
      expect(day, `${h.start.toDateString()} is a ${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][day]}`)
        .not.toBe(5);
      expect(day).not.toBe(6);
    }
  });

  it('never lands on a Monday, which is what the shift forward avoids', () => {
    for (const h of independence) {
      expect(h.start.getDay(), h.start.toDateString()).not.toBe(1);
    }
  });

  it('stays within three days of nominal 5 Iyar', () => {
    for (const h of independence) {
      const heb = hebrewOf(h.start);
      expect(heb.month).toBe('Iyar');
      expect(Math.abs(heb.day - 5), `observed on ${heb.day} Iyar`).toBeLessThanOrEqual(3);
    }
  });
});

/**
 * Where each holiday is DRAWN, checked against the day of the week it actually falls on.
 *
 * `HolidayLayer` positions a band at `dateToUnitOffset(start)` and gives it a width of
 * `dateToUnitOffset(end + 1) - start`. With the grid anchored to Sunday, the fractional part
 * of that offset is the weekday, so the arithmetic can be tied straight back to the calendar:
 * a band that starts on a Tuesday must begin two sevenths into its column.
 */
describe('each holiday is drawn on the right day of the right week', () => {
  const CHART = { year: 2026, month: 1 };

  it.each(all.map((h) => [h.name, h.start.toDateString(), h] as const))(
    '%s on %s begins at its own weekday and ends the day after its last',
    (_name, _date, h) => {
      const from = dateToUnitOffset(h.start, CHART.year, CHART.month, 'weeks');
      const dayInWeek = Math.round((from - Math.floor(from)) * 7);
      expect(dayInWeek, `starts at ${dayInWeek}/7 but the date is a ${h.start.getDay()}`)
        .toBe(h.start.getDay());

      const exclusiveEnd = new Date(h.end);
      exclusiveEnd.setDate(exclusiveEnd.getDate() + 1);
      const to = dateToUnitOffset(exclusiveEnd, CHART.year, CHART.month, 'weeks');
      const spanDays = Math.round((to - from) * 7);
      expect(spanDays, 'drawn width does not match the real length')
        .toBe(daysBetween(h.start, h.end) + 1);
    },
  );

  it('draws a holiday that straddles a week across two columns', () => {
    const straddling = all.filter((h) => {
      const from = dateToUnitOffset(h.start, CHART.year, CHART.month, 'weeks');
      const end = new Date(h.end);
      end.setDate(end.getDate() + 1);
      const to = dateToUnitOffset(end, CHART.year, CHART.month, 'weeks');
      return Math.floor(from) !== Math.floor(to - 1e-9);
    });
    // Rosh Hashanah falls on a Saturday and Sunday in 2026, so at least one must straddle.
    expect(straddling.length, 'no holiday crosses a week boundary in 2026-2028')
      .toBeGreaterThan(0);
    for (const h of straddling) {
      expect(h.start.getDay(), `${h.name} straddles but does not end a week`).toBe(6);
    }
  });
});
