import { describe, it, expect } from 'vitest';
import { getHolidays } from '@/utils/holidays';

const d = (iso: string) => {
  const [y, m, day] = iso.split('-').map(Number);
  return new Date(y!, m! - 1, day!);
};
const iso = (x: Date) =>
  `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;

const inYear = (y: number) => getHolidays(d(`${y}-01-01`), d(`${y}-12-31`));
const named = (y: number, name: string) => inYear(y).filter((h) => h.name === name);

describe('getHolidays', () => {
  it('finds Rosh Hashanah 5787 as a single two-day span', () => {
    const [rh] = named(2026, 'Rosh Hashanah');
    expect(iso(rh!.start)).toBe('2026-09-12');
    expect(iso(rh!.end)).toBe('2026-09-13');
  });

  it('finds Yom Kippur as a single day', () => {
    const [yk] = named(2026, 'Yom Kippur');
    expect(iso(yk!.start)).toBe('2026-09-21');
    expect(iso(yk!.end)).toBe('2026-09-21');
  });

  it('finds Passover and the seventh day as separate spans', () => {
    expect(iso(named(2026, 'Passover')[0]!.start)).toBe('2026-04-02');
    expect(iso(named(2026, 'Seventh of Passover')[0]!.start)).toBe('2026-04-08');
  });

  it('finds Shavuot', () => {
    expect(iso(named(2026, 'Shavuot')[0]!.start)).toBe('2026-05-22');
  });

  it('does NOT mark working days — Chol HaMoed, Purim, Yom HaZikaron, Lag BaOmer', () => {
    const days = new Set(
      inYear(2026).flatMap((h) => {
        const out: string[] = [];
        for (let t = new Date(h.start); t <= h.end; t.setDate(t.getDate() + 1)) out.push(iso(new Date(t)));
        return out;
      }),
    );
    // Chol HaMoed Pesach 2026, Purim 2026, Yom HaZikaron 2026, Lag BaOmer 2026.
    for (const working of ['2026-04-03', '2026-04-06', '2026-03-03', '2026-04-21', '2026-05-05']) {
      expect(days.has(working), `${working} should be a working day`).toBe(false);
    }
  });

  it('never lets two spans overlap or touch', () => {
    const spans = inYear(2026).sort((a, b) => a.start.getTime() - b.start.getTime());
    for (let i = 1; i < spans.length; i++) {
      expect(spans[i]!.start.getTime()).toBeGreaterThan(spans[i - 1]!.end.getTime());
    }
  });

  it('moves Independence Day off Friday and Saturday', () => {
    // Check every year in a decade: the observed day must never be a Friday or Saturday.
    for (let y = 2024; y <= 2034; y++) {
      const ind = named(y, 'Independence Day')[0];
      if (!ind) continue;
      expect([5, 6], `${y}: ${iso(ind.start)}`).not.toContain(ind.start.getDay());
    }
  });

  it('returns every vacation day each year, for a decade', () => {
    for (let y = 2024; y <= 2034; y++) {
      const names = new Set(inYear(y).map((h) => h.name));
      for (const required of ['Rosh Hashanah', 'Yom Kippur', 'Sukkot', 'Passover', 'Shavuot']) {
        expect(names.has(required), `${y} missing ${required}`).toBe(true);
      }
    }
  });

  it('handles a leap year with Adar I and Adar II without duplicating anything', () => {
    // 5787 (2026-27) is a leap year.
    const spans = getHolidays(d('2026-09-01'), d('2027-10-31'));
    const key = (h: (typeof spans)[number]) => `${h.name}@${iso(h.start)}`;
    expect(new Set(spans.map(key)).size).toBe(spans.length);
  });

  it('returns nothing for an inverted range', () => {
    expect(getHolidays(d('2026-12-31'), d('2026-01-01'))).toEqual([]);
  });

  it('carries a Hebrew name for every span', () => {
    for (const h of inYear(2026)) expect(h.nameHe).toMatch(/[֐-׿]/);
  });
});
