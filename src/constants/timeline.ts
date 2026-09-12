export const MIN_MONTH_WIDTH = 4;
export const MAX_MONTH_WIDTH = 180;
export const ZOOM_STEP = 10;
export const DEFAULT_MONTH_WIDTH = 80;

export const DEFAULT_WEEK_WIDTH = 40;
export const MIN_WEEK_WIDTH = 4;
export const MAX_WEEK_WIDTH = 180;

export const ROW_HEIGHT = 40;
export const ROW_HEIGHT_SMALL = 28;
export const ROW_HEIGHT_LARGE = 56;
export const ROW_SIZE_MAP = {
  small: ROW_HEIGHT_SMALL,
  medium: ROW_HEIGHT,
  large: ROW_HEIGHT_LARGE,
} as const;

export const DEFAULT_SIDEBAR_WIDTH = 240;
export const MIN_SIDEBAR_WIDTH = 60;
export const MAX_SIDEBAR_WIDTH = 400;

export const MONTH_NAMES_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
] as const;

export const QUARTER_NAMES = ['Q1', 'Q2', 'Q3', 'Q4'] as const;

export const DOUBLE_TAP_DELAY = 300; // ms
export const DOUBLE_TAP_DISTANCE = 25; // px
export const EDGE_THRESHOLD = 12; // px — left/right resize hit zone

/**
 * Top/bottom (row-span) hit zone, in px.
 *
 * Must stay narrow: a bar is only `rowHeight - 8` tall, so at the default 40px row a 12px
 * zone at each end leaves just 8px that starts a move — which made dragging a bar to another
 * row nearly impossible. 6px also matches the height of the rendered
 * `.resize-handle--top/--bottom` elements, so the hit zone is what the user can see.
 */
export const ROW_SPAN_EDGE_THRESHOLD = 6;

/**
 * A milestone is a one-unit bar with a heavy perimeter frame, not a diamond. The frame is
 * what distinguishes it, so it must stay thick; shrinking the shape instead would read as a
 * lesser thing rather than a different one.
 */
export const MILESTONE_OUTLINE_WIDTH = 3;
/** Ordinary bars carry the same frame, thinner. */
export const BAR_OUTLINE_WIDTH = 1.5;

/** Label sizes a bar can step through, smallest to largest. */
export const FONT_SIZE_STEPS = [8, 9, 10, 11, 12, 14, 16, 18] as const;
export const DEFAULT_BAR_FONT_SIZE = 10;
export const DEFAULT_MILESTONE_FONT_SIZE = 10;

/** Next size up/down the scale, clamped at both ends. */
export function stepFontSize(current: number, direction: 1 | -1): number {
  const steps = FONT_SIZE_STEPS;
  // Nearest step, so a value that came from an older file still moves sensibly.
  let idx = 0;
  for (let i = 1; i < steps.length; i++) {
    if (Math.abs(steps[i]! - current) < Math.abs(steps[idx]! - current)) idx = i;
  }
  const next = Math.min(steps.length - 1, Math.max(0, idx + direction));
  return steps[next]!;
}
