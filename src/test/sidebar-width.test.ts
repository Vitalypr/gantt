import { describe, it, expect } from 'vitest';
import { fitUnitWidth, sidebarWidthFromDrag } from '@/utils/layout';
import {
  DEFAULT_ROW_COUNT,
  MIN_SIDEBAR_WIDTH,
  MAX_SIDEBAR_WIDTH,
  MIN_MONTH_WIDTH,
  MAX_MONTH_WIDTH,
} from '@/constants/timeline';
import { useStore } from '@/stores';

/**
 * The divider sits on the edge the sidebar shares with the timeline, so "widen" is a drag
 * AWAY from the chart — rightward in LTR, leftward in RTL.
 *
 * The hook used to take `clientX` as the width outright. That is only the width when the
 * sidebar starts at viewport x=0, so in RTL — where the sidebar is the right-hand track and
 * the divider sits near the viewport width — every drag clamped to MAX_SIDEBAR_WIDTH on the
 * first pointermove.
 */
describe('sidebarWidthFromDrag', () => {
  it('widens on a rightward drag in LTR', () => {
    expect(sidebarWidthFromDrag(240, 60, false)).toBe(300);
  });

  it('narrows on a rightward drag in RTL', () => {
    expect(sidebarWidthFromDrag(240, 60, true)).toBe(180);
  });

  it('is mirror-symmetric: the same gesture moves the edge the same distance either way', () => {
    expect(sidebarWidthFromDrag(240, -75, true)).toBe(sidebarWidthFromDrag(240, 75, false));
  });

  it('does not clamp an RTL drag to the maximum the way an absolute clientX did', () => {
    // Divider at x≈1680 in a 1920px viewport: the old code fed 1680 straight in as the width.
    const startWidth = 240;
    const dividerX = 1680;
    expect(sidebarWidthFromDrag(startWidth, 20 - 0, true)).toBe(220);
    expect(Math.min(MAX_SIDEBAR_WIDTH, Math.max(MIN_SIDEBAR_WIDTH, dividerX))).toBe(MAX_SIDEBAR_WIDTH);
  });

  it('clamps at both ends', () => {
    expect(sidebarWidthFromDrag(240, -9999, false)).toBe(MIN_SIDEBAR_WIDTH);
    expect(sidebarWidthFromDrag(240, 9999, false)).toBe(MAX_SIDEBAR_WIDTH);
    expect(sidebarWidthFromDrag(240, 9999, true)).toBe(MIN_SIDEBAR_WIDTH);
    expect(sidebarWidthFromDrag(240, -9999, true)).toBe(MAX_SIDEBAR_WIDTH);
  });
});

/**
 * Every timeline column shares one width, so making them "change with the sidebar and stay
 * equal to each other" is exactly: re-divide the space left over by the unit count.
 */
describe('fitUnitWidth', () => {
  it('divides the space left beside the sidebar evenly', () => {
    expect(fitUnitWidth({ containerWidth: 1240, sidebarWidth: 240, totalUnits: 25, min: 4, max: 180 })).toBe(40);
  });

  it('gives the columns back what the sidebar gives up', () => {
    const wide = fitUnitWidth({ containerWidth: 1200, sidebarWidth: 400, totalUnits: 20, min: 4, max: 180 });
    const narrow = fitUnitWidth({ containerWidth: 1200, sidebarWidth: 200, totalUnits: 20, min: 4, max: 180 });
    expect(wide).toBe(40);
    expect(narrow).toBe(50);
    // The sidebar released 200px across 20 columns.
    expect(narrow! - wide!).toBe(10);
  });

  it('floors rather than overflowing the container', () => {
    const w = fitUnitWidth({ containerWidth: 1000, sidebarWidth: 240, totalUnits: 7, min: 4, max: 180 })!;
    expect(w * 7).toBeLessThanOrEqual(1000 - 240);
  });

  it('clamps to the zoom limits', () => {
    expect(fitUnitWidth({ containerWidth: 99999, sidebarWidth: 240, totalUnits: 2, min: MIN_MONTH_WIDTH, max: MAX_MONTH_WIDTH })).toBe(MAX_MONTH_WIDTH);
    expect(fitUnitWidth({ containerWidth: 300, sidebarWidth: 240, totalUnits: 500, min: MIN_MONTH_WIDTH, max: MAX_MONTH_WIDTH })).toBe(MIN_MONTH_WIDTH);
  });

  it('returns null when there is nothing to divide, so the caller keeps the current width', () => {
    expect(fitUnitWidth({ containerWidth: 1000, sidebarWidth: 240, totalUnits: 0, min: 4, max: 180 })).toBeNull();
  });
});

describe('default chart', () => {
  it('opens with DEFAULT_ROW_COUNT empty rows in both modes', () => {
    const s = useStore.getState();
    expect(DEFAULT_ROW_COUNT).toBe(12);
    expect(s.chart.rows).toHaveLength(DEFAULT_ROW_COUNT);
    expect(s.weeksChart.rows).toHaveLength(DEFAULT_ROW_COUNT);
    expect(s.chart.rows.every((r) => r.name === '' && r.activityIds.length === 0)).toBe(true);
  });

  it('numbers the rows consecutively from zero', () => {
    expect(useStore.getState().chart.rows.map((r) => r.order)).toEqual(
      Array.from({ length: DEFAULT_ROW_COUNT }, (_, i) => i),
    );
  });

  it('gives every row a distinct id', () => {
    const ids = useStore.getState().chart.rows.map((r) => r.id);
    expect(new Set(ids).size).toBe(DEFAULT_ROW_COUNT);
  });
});
