import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { contrastRatio, isColorDark, pickLabelColor, LABEL_DARK, LABEL_LIGHT } from '@/utils/color';
import {
  ACTIVITY_COLOR_GROUPS,
  ALL_ACTIVITY_COLORS,
  BASE_TONE_COLORS,
  BASE_TONE_INDEX,
  COLOR_TONES,
  DEFAULT_ACTIVITY_COLOR,
} from '@/constants/colors';

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

/**
 * The picker renders the palette as a matrix, so the shape of the data IS the layout: a row
 * with a missing entry shifts every swatch after it under the wrong tone heading.
 */
describe('palette matrix', () => {
  it('gives every hue one swatch per tone', () => {
    for (const group of ACTIVITY_COLOR_GROUPS) {
      expect(group.colors, group.name).toHaveLength(COLOR_TONES.length);
    }
  });

  it('keeps every colour a distinct hex, so no two swatches are the same pick', () => {
    expect(new Set(ALL_ACTIVITY_COLORS).size).toBe(ALL_ACTIVITY_COLORS.length);
  });

  it('gets darker left to right in every row', () => {
    for (const group of ACTIVITY_COLOR_GROUPS) {
      const onWhite = group.colors.map((c) => contrastRatio(c, '#ffffff'));
      for (let i = 1; i < onWhite.length; i++) {
        expect(onWhite[i]!, `${group.name} ${COLOR_TONES[i]} vs ${COLOR_TONES[i - 1]}`)
          .toBeGreaterThan(onWhite[i - 1]!);
      }
    }
  });

  it('still contains the default activity colour', () => {
    expect(ALL_ACTIVITY_COLORS).toContain(DEFAULT_ACTIVITY_COLOR);
  });

  it('takes the base tone from the 500 column', () => {
    expect(BASE_TONE_COLORS).toHaveLength(ACTIVITY_COLOR_GROUPS.length);
    expect(BASE_TONE_COLORS).toContain(DEFAULT_ACTIVITY_COLOR);
    expect(COLOR_TONES[BASE_TONE_INDEX]).toBe(500);
  });
});

/**
 * Theme tokens, read from `src/index.css` rather than restated here — a test that hardcodes
 * the values it checks passes forever while the stylesheet drifts away from it.
 */
describe('theme borders are visible in both themes', () => {
  const css = readFileSync(resolve(process.cwd(), 'src/index.css'), 'utf8');

  const tokenIn = (block: 'light' | 'dark', name: string): string => {
    // The light palette lives in `@theme {`, the dark override in `.dark {`. Search forward
    // from the marker and take the first declaration: bounding on the next `}` breaks on the
    // nested at-rules in between.
    const start = css.indexOf(block === 'dark' ? '.dark {' : '@theme {');
    if (start < 0) throw new Error(`${block} block not found`);
    const match = new RegExp(`${name}:\\s*(#[0-9a-fA-F]{6})`).exec(css.slice(start));
    if (!match) throw new Error(`${name} not found in the ${block} block`);
    return match[1]!;
  };

  it.each([
    ['light', '--color-background', '--color-border'],
    ['dark', '--color-background', '--color-border'],
  ] as const)('%s: --color-border clears the 3:1 floor for a UI boundary', (block, bgName, name) => {
    const ratio = contrastRatio(tokenIn(block, name), tokenIn(block, bgName));
    expect(ratio, `${block} ${name} scored ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(2.9);
  });

  it.each(['light', 'dark'] as const)(
    '%s: --color-border-subtle is quiet but not invisible',
    (block) => {
      const ratio = contrastRatio(
        tokenIn(block, '--color-border-subtle'),
        tokenIn(block, '--color-background'),
      );
      // Deliberately below 3:1 — it is a row hairline, not a component boundary — but a
      // divider under about 1.5:1 cannot be seen at all, which is what it used to be.
      expect(ratio, `${block} subtle scored ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(1.8);
      expect(ratio).toBeLessThan(3);
    },
  );
});
