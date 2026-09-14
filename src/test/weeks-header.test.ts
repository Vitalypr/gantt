import { describe, it, expect } from 'vitest';
import { weekRangeForWidth } from '@/utils/i18n';
import {
  buildMonthHeadersForWeeks,
  buildWeekHeaders,
  buildYearHeadersForWeeks,
  dateToUnitOffset,
} from '@/utils/timeline';

/** The three weeks-mode tiers must cover exactly the same columns, or nothing lines up. */
describe('weeks-mode header tiers', () => {
  const cases: Array<[number, number, number, number]> = [
    [2026, 2026, 1, 12],
    [2026, 2028, 1, 12],
    [2026, 2027, 4, 9],
    [2026, 2026, 7, 7],
  ];

  for (const [sy, ey, sm, em] of cases) {
    const label = `${sy}/${sm} → ${ey}/${em}`;

    it(`year tier spans the same weeks as the month tier (${label})`, () => {
      const years = buildYearHeadersForWeeks(sy, ey, sm, em);
      const months = buildMonthHeadersForWeeks(sy, ey, sm, em);
      const sum = (xs: { spanWeeks: number }[]) => xs.reduce((n, x) => n + x.spanWeeks, 0);
      expect(sum(years)).toBe(sum(months));
    });

    it(`year tier is contiguous and ordered (${label})`, () => {
      const years = buildYearHeadersForWeeks(sy, ey, sm, em);
      let cursor = 0;
      for (const y of years) {
        expect(y.startWeek).toBe(cursor);
        expect(y.spanWeeks).toBeGreaterThan(0);
        cursor += y.spanWeeks;
      }
    });

    it(`each year appears exactly once (${label})`, () => {
      const years = buildYearHeadersForWeeks(sy, ey, sm, em).map((y) => y.year);
      expect(new Set(years).size).toBe(years.length);
      expect([...years].sort((a, b) => a - b)).toEqual(years);
    });
  }

  it('month headers carry structure, not a pre-formatted label', () => {
    for (const m of buildMonthHeadersForWeeks(2026, 2027, 1, 12)) {
      expect(m.year).toBeGreaterThan(2000);
      expect(m.month).toBeGreaterThanOrEqual(1);
      expect(m.month).toBeLessThanOrEqual(12);
    }
  });

  it('a single-month range yields one year band', () => {
    const years = buildYearHeadersForWeeks(2026, 2026, 7, 7);
    expect(years).toHaveLength(1);
    expect(years[0]!.year).toBe(2026);
  });

  it('week headers exist for the whole span', () => {
    expect(buildWeekHeaders(2026, 2026, 1, 12).length).toBeGreaterThan(50);
  });
});

/**
 * Week columns are real weeks: they start on Sunday, whatever weekday the chart's start month
 * begins on. Anchoring to the 1st instead made a Saturday-to-Sunday holiday sit inside one
 * column, because that column ran Thursday to Wednesday.
 */
describe('week buckets start on Sunday', () => {
  const dayOfUnit0 = (year: number, month: number) => {
    // Offset 0 is the anchor, so the date whose offset is exactly 0 is the grid's first day.
    const first = new Date(year, month - 1, 1);
    const backToSunday = new Date(first);
    backToSunday.setDate(first.getDate() - first.getDay());
    return backToSunday;
  };

  it.each([
    [2026, 1],
    [2026, 9],
    [2027, 3],
    [2028, 6],
  ])('anchors %i-%i on a Sunday', (year, month) => {
    expect(dayOfUnit0(year, month).getDay()).toBe(0);
    expect(dateToUnitOffset(dayOfUnit0(year, month), year, month, 'weeks')).toBe(0);
  });

  it('puts each weekday of one week in the same column', () => {
    const sunday = dayOfUnit0(2026, 1);
    const offsets = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(sunday);
      d.setDate(sunday.getDate() + i);
      return Math.floor(dateToUnitOffset(d, 2026, 1, 'weeks'));
    });
    expect(new Set(offsets).size).toBe(1);
  });

  it('puts Saturday and the following Sunday in DIFFERENT columns', () => {
    const sunday = dayOfUnit0(2026, 1);
    const saturday = new Date(sunday);
    saturday.setDate(sunday.getDate() + 6);
    const nextSunday = new Date(sunday);
    nextSunday.setDate(sunday.getDate() + 7);
    const a = Math.floor(dateToUnitOffset(saturday, 2026, 1, 'weeks'));
    const b = Math.floor(dateToUnitOffset(nextSunday, 2026, 1, 'weeks'));
    expect(b).toBe(a + 1);
  });

  it('splits Rosh Hashanah 2026 across two columns, which is what it does on a calendar', () => {
    // 1-2 Tishri 5787 fall on Saturday 12 and Sunday 13 September 2026.
    const sat = new Date(2026, 8, 12);
    const sun = new Date(2026, 8, 13);
    expect(sat.getDay()).toBe(6);
    expect(sun.getDay()).toBe(0);
    const colSat = Math.floor(dateToUnitOffset(sat, 2026, 1, 'weeks'));
    const colSun = Math.floor(dateToUnitOffset(sun, 2026, 1, 'weeks'));
    expect(colSun).toBe(colSat + 1);
  });
});

/**
 * Every week column carries the days it covers under its number. The range degrades by the
 * width available — a clipped date is worse than a short one — and the ladder is asserted
 * here so a narrower default zoom cannot silently start printing half a date.
 */
describe('week date range', () => {
  const sunday = new Date(2026, 8, 6); // Sun 6 Sep 2026
  const saturday = new Date(2026, 8, 12); // Sat 12 Sep
  const crossesMonth = { start: new Date(2026, 8, 27), end: new Date(2026, 9, 3) };

  it('prints both ends when the column is wide', () => {
    expect(weekRangeForWidth(sunday, saturday, 80)).toBe('06.09–12.09');
  });

  it('drops the repeated month at the default zoom of 40', () => {
    expect(weekRangeForWidth(sunday, saturday, 40)).toBe('06–12.09');
  });

  it('keeps both months when the week crosses one, or falls back rather than lying', () => {
    expect(weekRangeForWidth(crossesMonth.start, crossesMonth.end, 80)).toBe('27.09–03.10');
    // No room for both, and "27–03.10" would read as September — so print the start only.
    expect(weekRangeForWidth(crossesMonth.start, crossesMonth.end, 40)).toBe('27.09');
  });

  it('falls back to the start date, then to nothing', () => {
    expect(weekRangeForWidth(sunday, saturday, 30)).toBe('06.09');
    expect(weekRangeForWidth(sunday, saturday, 20)).toBe('');
  });

  it('zero pads both parts, so the column stays the same width all year', () => {
    const jan = new Date(2026, 0, 4);
    expect(weekRangeForWidth(jan, new Date(2026, 0, 10), 80)).toBe('04.01–10.01');
  });

  it('gives every header the Sunday it starts on and the Saturday it ends on', () => {
    for (const h of buildWeekHeaders(2026, 2026, 1, 12)) {
      expect(h.start.getDay(), `week ${h.weekIndex} starts on day ${h.start.getDay()}`).toBe(0);
      expect(h.end.getDay(), `week ${h.weekIndex} ends on day ${h.end.getDay()}`).toBe(6);
      expect(Math.round((h.end.getTime() - h.start.getTime()) / 86400000)).toBe(6);
    }
  });
});
