import { describe, it, expect } from 'vitest';
import { contrastRatio, isColorDark, pickLabelColor, LABEL_DARK, LABEL_LIGHT } from '@/utils/color';
import { ALL_ACTIVITY_COLORS, DEFAULT_ACTIVITY_COLOR } from '@/constants/colors';

/** The YIQ shortcut that used to pick label colours, for comparison. */
function yiqIsDark(hex: string): boolean {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 < 0.6;
}

describe('contrastRatio', () => {
  it('is 21:1 for black on white', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 1);
  });

  it('is 1:1 for a colour against itself', () => {
    expect(contrastRatio('#3b82f6', '#3b82f6')).toBeCloseTo(1, 5);
  });

  it('is symmetric', () => {
    expect(contrastRatio('#ef4444', '#ffffff')).toBeCloseTo(contrastRatio('#ffffff', '#ef4444'), 10);
  });

  it('handles 3-digit hex', () => {
    expect(contrastRatio('#fff', '#000')).toBeCloseTo(21, 1);
  });
});

describe('pickLabelColor', () => {
  it('every palette swatch reaches the 3:1 floor for non-text UI and large text', () => {
    for (const swatch of ALL_ACTIVITY_COLORS) {
      const ratio = contrastRatio(pickLabelColor(swatch), swatch);
      expect(ratio, `${swatch} scored ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(3);
    }
  });

  it('always picks the better of the two label colours', () => {
    for (const swatch of ALL_ACTIVITY_COLORS) {
      const chosen = pickLabelColor(swatch);
      const other = chosen === LABEL_LIGHT ? LABEL_DARK : LABEL_LIGHT;
      expect(contrastRatio(chosen, swatch)).toBeGreaterThanOrEqual(contrastRatio(other, swatch));
    }
  });

  it('beats the old YIQ rule on the saturated mid-tones it misclassified', () => {
    // Orange-500, green-500, teal-500, cyan-500 — the swatches where YIQ chose white.
    const offenders = ['#f97316', '#22c55e', '#14b8a6', '#06b6d4'];
    for (const swatch of offenders) {
      expect(yiqIsDark(swatch), `${swatch}: YIQ chose white`).toBe(true);
      const yiqRatio = contrastRatio(LABEL_LIGHT, swatch);
      expect(yiqRatio, `${swatch}: YIQ ratio`).toBeLessThan(3);

      const ours = contrastRatio(pickLabelColor(swatch), swatch);
      expect(ours, `${swatch}: fixed ratio`).toBeGreaterThanOrEqual(3);
      expect(ours).toBeGreaterThan(yiqRatio);
    }
  });

  it('is white on a very dark fill and dark on a very light one', () => {
    expect(pickLabelColor('#0f172a')).toBe(LABEL_LIGHT);
    expect(pickLabelColor('#f8fafc')).toBe(LABEL_DARK);
  });

  it('isColorDark agrees with pickLabelColor', () => {
    for (const swatch of ALL_ACTIVITY_COLORS) {
      expect(isColorDark(swatch)).toBe(pickLabelColor(swatch) === LABEL_LIGHT);
    }
  });

  it('falls back safely on an invalid colour rather than throwing', () => {
    expect(() => pickLabelColor('not-a-colour')).not.toThrow();
  });

  it('the default bar colour reaches the floor', () => {
    expect(contrastRatio(pickLabelColor(DEFAULT_ACTIVITY_COLOR), DEFAULT_ACTIVITY_COLOR))
      .toBeGreaterThanOrEqual(3);
  });
});
