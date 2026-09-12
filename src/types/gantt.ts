export const ANCHOR_SIDES = ['left', 'right', 'top', 'bottom'] as const;
export type AnchorSide = (typeof ANCHOR_SIDES)[number];

export type Dependency = {
  id: string;
  fromActivityId: string;
  toActivityId: string;
  fromSide: AnchorSide;
  toSide: AnchorSide;
};

export type Activity = {
  id: string;
  name: string;
  color: string;
  startMonth: number;
  durationMonths: number;
  order: number;
  isMilestone?: boolean;
  rowSpan?: number;
  annotation?: string;
  /** Frame colour. Undefined means "follow the theme" (`--color-bar-outline`), never a
   *  frozen literal — a hardcoded grey would not re-theme in dark mode. */
  outlineColor?: string;
  /** Label size in px. Undefined means the size-for-kind default. */
  fontSize?: number;
  /** Completion, 0-100, drawn as a darker inner fill. Undefined means not tracked. */
  progress?: number;
};

export type GanttRow = {
  id: string;
  name: string;
  order: number;
  activityIds: string[];
  /** If true, this row's name cell is merged with the next row below */
  mergedWithNext?: boolean;
  /** Marks this row as a phase header. The rows after it, up to the next header, belong to it. */
  isGroup?: boolean;
  /** Only meaningful on a group row: hides its member rows and shows a rollup bar instead. */
  collapsed?: boolean;
};

/**
 * A named vertical line: a deadline, gate or review.
 *
 * Stored as an ISO calendar date rather than a unit offset, so it keeps its real-world
 * meaning when the chart's date range is rebased or the timeline mode changes - unlike
 * `Activity.startMonth`, which is an offset and gets rebased with the range.
 */
export type ChartMarker = {
  id: string;
  name: string;
  /** `YYYY-MM-DD`. */
  date: string;
  color?: string;
};

export type TimelineMode = 'months' | 'weeks';

export const CHART_DIRECTIONS = ['ltr', 'rtl'] as const;
export type ChartDirection = (typeof CHART_DIRECTIONS)[number];

export type ViewSettings = {
  sidebarWidth: number;
  monthWidth: number;
  weekWidth?: number;
  rowSize: 'small' | 'medium' | 'large';
  showQuarters: boolean;
  timelineMode?: TimelineMode;
  chartDirection?: ChartDirection;
  showLegend?: boolean;
};

/** The unit a chart's integer offsets are measured in. */
export type ChartUnit = 'month' | 'week';

/**
 * A chart, discriminated by the unit its offsets are counted in.
 *
 * The two charts used to be separate, member-for-member IDENTICAL types, so they were
 * mutually assignable and the compiler could not flag a misrouted one. Every mode bug in this
 * codebase came from that — including Save silently writing the months chart while the user
 * edited the weeks chart. The `unit` discriminant makes `MonthsChart` and `WeeksChart`
 * genuinely incompatible, so a misroute is now a type error rather than a runtime surprise.
 *
 * `Activity.startMonth` is an integer offset in THIS unit, not a date.
 */
type ChartOf<U extends ChartUnit> = {
  id: string;
  name: string;
  unit: U;
  startYear: number;
  startMonth: number; // 1-12
  endYear: number;
  endMonth: number;   // 1-12
  rows: GanttRow[];
  activities: Activity[];
  dependencies: Dependency[];
  markers?: ChartMarker[];
  /** Colour -> meaning. Entries are only kept for colours actually in use. */
  legend?: { color: string; label: string }[];
  viewSettings?: ViewSettings;
  createdAt: string;
  updatedAt: string;
};

export type MonthsChart = ChartOf<'month'>;
export type WeeksChart = ChartOf<'week'>;

/**
 * Either chart.
 *
 * A genuine discriminated UNION, not one type with a union-typed field — only a union lets
 * `if (chart.unit === 'week')` narrow, which is what makes a misroute a compile error.
 */
export type Chart = MonthsChart | WeeksChart;

/** @deprecated Use `MonthsChart`. Kept so existing imports keep compiling. */
export type GanttChart = MonthsChart;

/** The unit that goes with a timeline mode. */
export function unitForMode(mode: TimelineMode): ChartUnit {
  return mode === 'weeks' ? 'week' : 'month';
}

export type SavedChartEntry = {
  id: string;
  name: string;
  updatedAt: string;
  /** Which chart this save came from. Absent on entries written before saves were
   *  mode-aware; treat that as 'months'. */
  mode?: TimelineMode;
};
