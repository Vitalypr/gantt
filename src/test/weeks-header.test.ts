import { describe, it, expect } from 'vitest';
import {
  buildMonthHeadersForWeeks,
  buildWeekHeaders,
  buildYearHeadersForWeeks,
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
