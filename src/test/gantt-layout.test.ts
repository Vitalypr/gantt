import { describe, it, expect } from 'vitest';
import { ROW_SIZE_MAP } from '@/constants/timeline';
import {
  ADD_ROW_BAND,
  MIN_BODY_HEIGHT,
  TIER_HEIGHT,
  bodyHeightFor,
  getHeaderHeight,
  WEEK_TIER_HEIGHT,
  getHeaderTierHeights,
} from '@/utils/layout';

/**
 * Regression cover for "double-click stops adding rows after ~7 rows".
 *
 * The sidebar's double-click-to-add-row affordance fires only when the pointer misses
 * `[data-sidebar-row]`, so it needs empty sidebar below the last row. That band used to be
 * an artifact of a hardcoded 300px floor, so it vanished the moment the rows grew past
 * 300px — at rowSize 'medium' that is exactly 8 rows.
 */
describe('bodyHeightFor', () => {
  it('always leaves an empty band below the last row, at every row size and count', () => {
    for (const size of ['small', 'medium', 'large'] as const) {
      const rowHeight = ROW_SIZE_MAP[size];
      for (let rows = 1; rows <= 200; rows++) {
        const totalHeight = rows * rowHeight;
        const band = bodyHeightFor(totalHeight) - totalHeight;
        expect(
          band,
          `${size} @ ${rows} rows (${totalHeight}px) must leave an empty band`,
        ).toBeGreaterThanOrEqual(ADD_ROW_BAND);
      }
    }
  });

  it('reproduces the old floor that broke it: 8 medium rows leave nothing', () => {
    const oldBodyHeight = (total: number) => Math.max(total, MIN_BODY_HEIGHT);
    const sevenRows = 7 * ROW_SIZE_MAP.medium;
    const eightRows = 8 * ROW_SIZE_MAP.medium;

    expect(oldBodyHeight(sevenRows) - sevenRows).toBeGreaterThan(0);
    expect(oldBodyHeight(eightRows) - eightRows).toBe(0);

    expect(bodyHeightFor(eightRows) - eightRows).toBe(ADD_ROW_BAND);
  });

  it('keeps the floor for a nearly empty chart, so exports are not a sliver', () => {
    expect(bodyHeightFor(0)).toBe(MIN_BODY_HEIGHT);
    expect(bodyHeightFor(40)).toBe(MIN_BODY_HEIGHT);
  });

  it('does not pad beyond the band once past the floor, to keep exports tight', () => {
    expect(bodyHeightFor(1200)).toBe(1200 + ADD_ROW_BAND);
  });
});

describe('getHeaderHeight', () => {
  it('agrees with the sum of the tiers it hands the header component', () => {
    for (const mode of ['months', 'weeks'] as const) {
      for (const q of [true, false]) {
        const t = getHeaderTierHeights(mode, q);
        expect(getHeaderHeight(mode, q)).toBe(t.top + (t.middle ?? 0) + t.unit);
      }
    }
  });

  it('weeks mode always has three tiers — Year / Month / Week', () => {
    for (const q of [true, false]) {
      expect(getHeaderTierHeights('weeks', q).top).toBe(TIER_HEIGHT);
      expect(getHeaderTierHeights('weeks', q).middle).toBe(TIER_HEIGHT);
      expect(getHeaderHeight('weeks', q)).toBe(TIER_HEIGHT * 2 + WEEK_TIER_HEIGHT);
    }
  });

  it('gives the week tier extra height, because it carries a second line of dates', () => {
    expect(getHeaderTierHeights('weeks', true).unit).toBe(WEEK_TIER_HEIGHT);
    expect(WEEK_TIER_HEIGHT).toBeGreaterThan(TIER_HEIGHT);
  });

  it('months mode drops the middle tier when quarters are hidden', () => {
    expect(getHeaderHeight('months', true)).toBe(TIER_HEIGHT * 3);
    expect(getHeaderTierHeights('months', false).middle).toBeUndefined();
    expect(getHeaderHeight('months', false)).toBe(TIER_HEIGHT * 2);
  });

  it('never returns an undefined tier height, which would render unsized', () => {
    for (const mode of ['months', 'weeks'] as const) {
      const t = getHeaderTierHeights(mode, true);
      expect(t.top).toBeGreaterThan(0);
      expect(t.unit).toBeGreaterThan(0);
    }
  });
});
