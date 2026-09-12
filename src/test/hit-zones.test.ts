import { describe, it, expect } from 'vitest';
import { EDGE_THRESHOLD, ROW_SPAN_EDGE_THRESHOLD, ROW_SIZE_MAP } from '@/constants/timeline';

/** Mirrors the hit test in ActivityBar's onPointerDown. */
function gestureAt(relX: number, relY: number, w: number, h: number) {
  if (relY < ROW_SPAN_EDGE_THRESHOLD) return 'rowSpanTop';
  if (relY > h - ROW_SPAN_EDGE_THRESHOLD) return 'rowSpanBottom';
  if (relX < EDGE_THRESHOLD) return 'resizeLeft';
  if (relX > w - EDGE_THRESHOLD) return 'resizeRight';
  return 'move';
}

describe('activity bar hit zones', () => {
  // Bar height is rowHeight - 8 (4px padding top and bottom).
  const barHeight = (size: keyof typeof ROW_SIZE_MAP) => ROW_SIZE_MAP[size] - 8;

  it('leaves a usable move band at every row size', () => {
    for (const size of ['small', 'medium', 'large'] as const) {
      const h = barHeight(size);
      const band = h - 2 * ROW_SPAN_EDGE_THRESHOLD;
      expect(band, `${size} move band`).toBeGreaterThanOrEqual(8);
    }
  });

  it('the old 12px zone left almost nothing to grab at the default size', () => {
    const h = barHeight('medium'); // 32
    expect(h - 2 * EDGE_THRESHOLD).toBe(8);
    expect(h - 2 * ROW_SPAN_EDGE_THRESHOLD).toBe(20);
  });

  it('a press in the middle of the bar starts a move, not a row span', () => {
    const h = barHeight('medium');
    expect(gestureAt(50, h / 2, 200, h)).toBe('move');
  });

  it('still reaches both row-span edges', () => {
    const h = barHeight('medium');
    expect(gestureAt(50, 1, 200, h)).toBe('rowSpanTop');
    expect(gestureAt(50, h - 1, 200, h)).toBe('rowSpanBottom');
  });

  it('left/right resize still wins over move away from the vertical edges', () => {
    const h = barHeight('medium');
    expect(gestureAt(2, h / 2, 200, h)).toBe('resizeLeft');
    expect(gestureAt(198, h / 2, 200, h)).toBe('resizeRight');
  });
});
