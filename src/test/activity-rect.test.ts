import { describe, it, expect } from 'vitest';
import { getActivityRect, getAnchorPoint } from '@/utils/dependencyRouting';
import { unitSpanToLeft } from '@/utils/timeline';
import type { Activity } from '@/types/gantt';

const base: Activity = {
  id: 'a', name: 'A', color: '#3b82f6', startMonth: 3, durationMonths: 4, order: 0,
};
const ROW_HEIGHT = 40;
const UNIT = 80;
const TOTAL = 24;

const rect = (a: Activity, rowY: number, rowSpan = 1, isRtl = false) =>
  getActivityRect({ activity: a, rowY, unitWidth: UNIT, totalUnits: TOTAL, isRtl, rowSpan, rowHeight: ROW_HEIGHT });

/** What ActivityBar / MilestoneMarker actually render, restated from their style blocks. */
const renderedBox = (a: Activity, rowY: number, rowSpan = 1, isRtl = false) => {
  const width = a.isMilestone ? UNIT : Math.max(a.durationMonths * UNIT, UNIT * 0.5);
  return {
    left: unitSpanToLeft(a.startMonth, width / UNIT, UNIT, TOTAL, isRtl),
    top: rowY + 4,
    width,
    height: ROW_HEIGHT * (a.isMilestone ? 1 : rowSpan) - 8,
  };
};

describe('getActivityRect matches what is drawn', () => {
  for (const isRtl of [false, true]) {
    const dir = isRtl ? 'RTL' : 'LTR';

    it(`agrees with the rendered box for a bar (${dir})`, () => {
      expect(rect(base, 120, 1, isRtl)).toEqual(renderedBox(base, 120, 1, isRtl));
    });

    it(`agrees with the rendered box for a spanning bar (${dir})`, () => {
      expect(rect(base, 120, 3, isRtl)).toEqual(renderedBox(base, 120, 3, isRtl));
    });

    it(`agrees with the rendered box for a milestone (${dir})`, () => {
      const m: Activity = { ...base, isMilestone: true, durationMonths: 1 };
      expect(rect(m, 80, 1, isRtl)).toEqual(renderedBox(m, 80, 1, isRtl));
    });

    it(`a milestone occupies exactly the pixels a one-unit bar would (${dir})`, () => {
      const m: Activity = { ...base, isMilestone: true, durationMonths: 1 };
      const bar: Activity = { ...base, durationMonths: 1 };
      expect(rect(m, 80, 1, isRtl)).toEqual(rect(bar, 80, 1, isRtl));
    });

    it(`anchor dots land on the box, inside the 20px snap radius (${dir})`, () => {
      const r = rect(base, 80, 1, isRtl);
      const cssDot = { x: r.left + r.width, y: r.top + r.height / 2 };
      const routed = getAnchorPoint(r, 'right');
      expect(Math.hypot(routed.x - cssDot.x, routed.y - cssDot.y)).toBeLessThan(20);
    });
  }

  it('a milestone ignores rowSpan, matching the component', () => {
    const m: Activity = { ...base, isMilestone: true, durationMonths: 1 };
    expect(rect(m, 0, 4).height).toBe(ROW_HEIGHT - 8);
  });

  it('the OLD diamond model disagreed with the drawn box by far more than the snap radius', () => {
    expect(Math.abs(UNIT - Math.round(ROW_HEIGHT * 0.55))).toBeGreaterThan(20);
  });

  it('mirrors the box in RTL rather than leaving it in place', () => {
    expect(rect(base, 0, 1, true).left).not.toBe(rect(base, 0, 1, false).left);
  });
});
