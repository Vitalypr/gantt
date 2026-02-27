export const MIN_MONTH_WIDTH = 4;
export const MAX_MONTH_WIDTH = 180;
export const ZOOM_STEP = 10;
export const DEFAULT_MONTH_WIDTH = 80;

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
export const EDGE_THRESHOLD = 12; // px — resize handle hit zone
