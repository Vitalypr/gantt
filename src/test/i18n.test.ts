import { describe, it, expect } from 'vitest';
import { monthLabel, monthLong, monthShort, quarterLabelForWidth, weekLabelForWidth, localeForDirection } from '@/utils/i18n';

describe('month names', () => {
  it('names GREGORIAN months in Hebrew, not Hebrew-calendar months', () => {
    expect(monthLong('he', 11)).toBe('נובמבר');
    expect(monthLong('he', 1)).toBe('ינואר');
    // A Hebrew-calendar month name would be something like חשוון / תשרי.
    for (const m of [1, 6, 11]) {
      expect(['תשרי', 'חשוון', 'כסלו', 'ניסן', 'אייר', 'סיוון']).not.toContain(monthLong('he', m));
    }
  });

  it('gives twelve distinct Hebrew month names', () => {
    const names = Array.from({ length: 12 }, (_, i) => monthLong('he', i + 1));
    expect(new Set(names).size).toBe(12);
  });

  it('still reads English in LTR', () => {
    expect(monthLong('en', 11)).toBe('November');
    expect(monthShort('en', 1)).toBe('Jan');
  });
});

describe('label degradation ladder', () => {
  it('steps full name -> abbreviation -> number -> blank as the column narrows', () => {
    expect(monthLabel('en', 11, 100)).toBe('November');
    expect(monthLabel('en', 11, 40)).toBe('Nov');
    expect(monthLabel('en', 11, 20)).toBe('11');
    expect(monthLabel('en', 11, 8)).toBe('');
  });

  it('never widens as the column narrows', () => {
    let previous = Infinity;
    for (const w of [120, 80, 64, 50, 34, 20, 14, 8]) {
      const len = monthLabel('en', 11, w).length;
      expect(len).toBeLessThanOrEqual(previous);
      previous = len;
    }
  });

  it('applies the same ladder in Hebrew', () => {
    expect(monthLabel('he', 11, 100)).toBe('נובמבר');
    expect(monthLabel('he', 11, 8)).toBe('');
  });

  it('degrades quarters and weeks too', () => {
    expect(quarterLabelForWidth('en', 0, 2026, 100)).toBe('Q1 2026');
    expect(quarterLabelForWidth('en', 0, 2026, 30)).toBe('Q1');
    expect(quarterLabelForWidth('en', 0, 2026, 10)).toBe('');
    expect(weekLabelForWidth('en', 12, 40)).toBe('W12');
    expect(weekLabelForWidth('en', 12, 20)).toBe('12');
    expect(weekLabelForWidth('en', 12, 8)).toBe('');
  });
});

describe('localeForDirection', () => {
  it('maps direction to language in one place', () => {
    expect(localeForDirection('rtl')).toBe('he');
    expect(localeForDirection('ltr')).toBe('en');
  });
});
