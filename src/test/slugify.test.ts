import { describe, it, expect } from 'vitest';
import { slugifyChartName } from '@/utils/persistence';

/**
 * The old `[^a-z0-9]` filter erased Hebrew entirely, so every Hebrew-named export collided
 * on the same timestamped filename.
 */
describe('slugifyChartName', () => {
  it('keeps Hebrew intact', () => {
    expect(slugifyChartName('תוכנית אב')).toBe('תוכנית-אב');
  });

  it('keeps mixed Hebrew and Latin', () => {
    expect(slugifyChartName('שלום world')).toBe('שלום-world');
  });

  it('keeps ordinary Latin names readable', () => {
    expect(slugifyChartName('My Plan 2026')).toBe('My-Plan-2026');
  });

  it('replaces both path separators', () => {
    expect(slugifyChartName('a/b' + String.fromCharCode(92) + 'c')).toBe('a-b-c');
  });

  it('replaces the Windows-reserved set', () => {
    expect(slugifyChartName('a<b>c:d"e|f?g*h')).toBe('a-b-c-d-e-f-g-h');
  });

  it('strips control characters', () => {
    expect(slugifyChartName('a' + String.fromCharCode(9) + 'b' + String.fromCharCode(0) + 'c')).toBe('a-b-c');
  });

  it('collapses runs and trims leading/trailing separators', () => {
    expect(slugifyChartName('  --a   b--  ')).toBe('a-b');
  });

  it('never returns an empty name', () => {
    expect(slugifyChartName('')).toBe('gantt-chart');
    expect(slugifyChartName('///')).toBe('gantt-chart');
    expect(slugifyChartName('   ')).toBe('gantt-chart');
  });

  it('never returns a name a filesystem would reject', () => {
    const samples = ['תוכנית', 'a/b', '...', 'CON', 'x'.repeat(50), '<>:"|?*'];
    for (const s of samples) {
      const out = slugifyChartName(s);
      expect(out.length).toBeGreaterThan(0);
      for (const ch of out) {
        expect(ch >= ' ').toBe(true);
        expect('<>:"/|?*' + String.fromCharCode(92)).not.toContain(ch);
      }
    }
  });

  it('two different Hebrew names produce two different filenames', () => {
    expect(slugifyChartName('תוכנית א')).not.toBe(slugifyChartName('תוכנית ב'));
  });
});
