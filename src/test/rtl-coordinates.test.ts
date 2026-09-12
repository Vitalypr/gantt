import { describe, it, expect } from 'vitest';
import {
  clampStartUnit,
  deltaToUnits,
  resolveAnchorSide,
  unitSpanToLeft,
  visualEdgeToTemporalEdge,
  xToUnit,
} from '@/utils/timeline';

const W = 80;
const TOTAL = 12;

describe('unitSpanToLeft', () => {
  it('is the plain product in LTR', () => {
    expect(unitSpanToLeft(0, 1, W, TOTAL, false)).toBe(0);
    expect(unitSpanToLeft(3, 2, W, TOTAL, false)).toBe(240);
  });

  it('mirrors about the chart width in RTL', () => {
    // Unit 0 occupies the RIGHTMOST column.
    expect(unitSpanToLeft(0, 1, W, TOTAL, true)).toBe((TOTAL - 1) * W);
    // The last unit occupies the leftmost column.
    expect(unitSpanToLeft(TOTAL - 1, 1, W, TOTAL, true)).toBe(0);
  });

  it('keeps a span inside the canvas in both directions', () => {
    for (const isRtl of [false, true]) {
      for (let s = 0; s + 3 <= TOTAL; s++) {
        const left = unitSpanToLeft(s, 3, W, TOTAL, isRtl);
        expect(left).toBeGreaterThanOrEqual(0);
        expect(left + 3 * W).toBeLessThanOrEqual(TOTAL * W);
      }
    }
  });

  it('preserves ordering: an earlier bar is further right in RTL', () => {
    const earlier = unitSpanToLeft(1, 1, W, TOTAL, true);
    const later = unitSpanToLeft(5, 1, W, TOTAL, true);
    expect(earlier).toBeGreaterThan(later);
  });
});

describe('xToUnit', () => {
  it('round-trips with unitSpanToLeft in both directions', () => {
    for (const isRtl of [false, true]) {
      for (let u = 0; u < TOTAL; u++) {
        const left = unitSpanToLeft(u, 1, W, TOTAL, isRtl);
        // Probe the middle of the drawn column.
        expect(xToUnit(left + W / 2, W, TOTAL, isRtl)).toBe(u);
      }
    }
  });
});

describe('deltaToUnits', () => {
  it('moves later when dragging right in LTR', () => {
    expect(deltaToUnits(W * 2, W, false)).toBe(2);
  });

  it('moves EARLIER when dragging right in RTL', () => {
    expect(deltaToUnits(W * 2, W, true)).toBe(-2);
  });

  it('is not a double negation that collapses to the identity', () => {
    expect(deltaToUnits(W, W, true)).not.toBe(deltaToUnits(W, W, false));
  });
});

describe('clampStartUnit', () => {
  it('clamps at both ends', () => {
    expect(clampStartUnit(-5, 2, TOTAL)).toBe(0);
    expect(clampStartUnit(99, 2, TOTAL)).toBe(TOTAL - 2);
  });

  it('never returns a negative start when the span exceeds the chart', () => {
    expect(clampStartUnit(5, 99, TOTAL)).toBe(0);
  });
});

describe('visualEdgeToTemporalEdge', () => {
  it('is identity-shaped in LTR', () => {
    expect(visualEdgeToTemporalEdge('left', false)).toBe('start');
    expect(visualEdgeToTemporalEdge('right', false)).toBe('end');
  });

  it('swaps in RTL — the visually-left edge is the temporal END', () => {
    expect(visualEdgeToTemporalEdge('left', true)).toBe('end');
    expect(visualEdgeToTemporalEdge('right', true)).toBe('start');
  });
});

describe('resolveAnchorSide', () => {
  it('leaves sides alone in LTR', () => {
    for (const s of ['left', 'right', 'top', 'bottom'] as const) {
      expect(resolveAnchorSide(s, false)).toBe(s);
    }
  });

  it('swaps only the horizontal sides in RTL', () => {
    expect(resolveAnchorSide('left', true)).toBe('right');
    expect(resolveAnchorSide('right', true)).toBe('left');
    expect(resolveAnchorSide('top', true)).toBe('top');
    expect(resolveAnchorSide('bottom', true)).toBe('bottom');
  });

  it('is an involution, so the same call stores and renders', () => {
    for (const s of ['left', 'right', 'top', 'bottom'] as const) {
      expect(resolveAnchorSide(resolveAnchorSide(s, true), true)).toBe(s);
    }
  });
});
