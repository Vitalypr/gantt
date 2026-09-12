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

/**
 * Empty rows a brand-new chart starts with.
 *
 * A plan is drawn by filling rows that are already there, so the blank chart offers a sheet
 * rather than a single line and an empty-state prompt.
 */
export const DEFAULT_ROW_COUNT = 12;

/**
 * The sideways topic column.
 *
 * Narrow on purpose — it holds rotated text, so its width is the text's line height, not its
 * length. The column only renders when some row actually carries a topic.
 */
export const DEFAULT_TOPIC_WIDTH = 34;
export const MIN_TOPIC_WIDTH = 20;
export const MAX_TOPIC_WIDTH = 120;

/** Empty canvas between one topic block and the next. Not a row: nothing lands in it. */
export const TOPIC_GAP = 10;

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

/**
 * Status rail geometry, in px.
 *
 * Deliberately small and pinned to the bottom edge. The rail is absolutely positioned so it
 * takes no part in layout; the only vertical cost to the label is `STATUS_RAIL_RESERVE`,
 * which the bar adds as bottom padding so a label that wraps to two lines stops ABOVE the
 * rail instead of running under it.
 */
export const STATUS_RAIL_HEIGHT = 3;
export const STATUS_RAIL_BOTTOM = 3;
/** Horizontal inset from each end of the bar. */
export const STATUS_RAIL_INSET = 12;
/** Floor for that inset on a narrow bar, so the rail shrinks rather than disappearing.
 *  Also keeps it clear of a milestone's 3px frame. */
export const STATUS_RAIL_INSET_MIN = 4;
/** Share of the bar each inset may take before the floor applies. */
export const STATUS_RAIL_INSET_MAX_SHARE = '25%';

/** Diagonal hatch that marks a "not relevant" bar. */
export const STATUS_HATCH_ANGLE = 45;
export const STATUS_HATCH_STROKE = 1.5;
export const STATUS_HATCH_PITCH = 7;
/** Vertical space the label gives up while a rail is shown — nothing when it is not. */
export const STATUS_RAIL_RESERVE = STATUS_RAIL_HEIGHT + STATUS_RAIL_BOTTOM;

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
