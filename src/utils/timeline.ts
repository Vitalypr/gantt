// Labels are formatted at the render edge (see `utils/i18n.ts`) so they can localise;
// this module deals only in indices and spans.

// ---------------------------------------------------------------------------
// Date arithmetic
// ---------------------------------------------------------------------------

/**
 * Whole days between two dates, normalised to local midnight.
 *
 * NEVER write `(a.getTime() - b.getTime()) / 86400000`. Across a DST transition the quotient
 * is fractional — 90.9583 instead of 91 — and the surrounding `Math.floor(x / 7)` lands a
 * week early, which shifts every month and year boundary line and corrupts ISO week labels
 * for the rest of the chart.
 */
export function daysBetween(from: Date, to: Date): number {
  const a = Date.UTC(from.getFullYear(), from.getMonth(), from.getDate());
  const b = Date.UTC(to.getFullYear(), to.getMonth(), to.getDate());
  return Math.round((b - a) / 86_400_000);
}

/** `n` days after `date`, at local midnight. Survives DST; `+ n * 86400000` does not. */
export function addDays(date: Date, n: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + n);
}

// ---------------------------------------------------------------------------
// The unit <-> pixel choke point
// ---------------------------------------------------------------------------

/**
 * THE single place a unit index becomes a pixel offset.
 *
 * In RTL the time axis is mirrored: the earliest date sits at the RIGHT edge. `direction:
 * rtl` in CSS cannot express that — it does not move physical `left`, and applying it to the
 * grid inverts the scroll origin — so the mirroring is arithmetic, and it has to happen in
 * exactly one function. Anything that multiplies a unit index by a width outside this module
 * will be correct in LTR and silently wrong in RTL.
 */
export function unitSpanToLeft(
  startUnit: number,
  spanUnits: number,
  unitWidth: number,
  totalUnits: number,
  isRtl: boolean,
): number {
  return isRtl
    ? (totalUnits - startUnit - spanUnits) * unitWidth
    : startUnit * unitWidth;
}

/** The unit containing pixel `x`, measured from the LEFT edge of the timeline body. */
export function xToUnit(x: number, unitWidth: number, totalUnits: number, isRtl: boolean): number {
  const column = Math.floor(x / unitWidth);
  return isRtl ? totalUnits - 1 - column : column;
}

/**
 * A horizontal pointer delta as a signed number of units.
 *
 * In RTL, dragging right moves a bar EARLIER, so the sign flips. Written as a named function
 * because an inline version of this was once a double negation that collapsed to the
 * identity, which made bars impossible to move in RTL.
 */
export function deltaToUnits(deltaX: number, unitWidth: number, isRtl: boolean): number {
  return Math.round((isRtl ? -deltaX : deltaX) / unitWidth);
}

/**
 * Clamp a start index so the whole span stays inside the chart.
 *
 * BOTH bounds matter. A lower-bound-only clamp lets a bar leave the sized grid track on the
 * right in LTR — and off the LEFT edge in RTL, outside the scroll container's reach.
 */
export function clampStartUnit(startUnit: number, spanUnits: number, totalUnits: number): number {
  return Math.max(0, Math.min(startUnit, Math.max(0, totalUnits - spanUnits)));
}

/**
 * A calendar date as a FRACTIONAL unit offset from the chart start.
 *
 * Lives here beside the other conversions for the same reason `unitSpanToLeft` does: date ->
 * index and index -> pixel are one pipeline, and a second implementation of either half is
 * how the today marker and the grid drifted apart before. Fractional on purpose - a one-day
 * holiday must be a seventh of a week column, not a whole one.
 */
export function dateToUnitOffset(
  date: Date,
  startYear: number,
  startMonth: number,
  mode: 'months' | 'weeks',
): number {
  if (mode === 'weeks') {
    return daysBetween(new Date(startYear, startMonth - 1, 1), date) / 7;
  }
  const monthIndex = (date.getFullYear() - startYear) * 12 + date.getMonth() - (startMonth - 1);
  const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  return monthIndex + (date.getDate() - 1) / daysInMonth;
}

export type TemporalEdge = 'start' | 'end';

/**
 * The edge a pointer touched, as the edge it actually controls.
 *
 * `useDragResize` speaks temporally. In RTL the visually-left edge is the temporal END.
 */
export function visualEdgeToTemporalEdge(edge: 'left' | 'right', isRtl: boolean): TemporalEdge {
  if (isRtl) return edge === 'left' ? 'end' : 'start';
  return edge === 'left' ? 'start' : 'end';
}

/**
 * Map a stored (temporal) anchor side to the physical side it renders on, and back.
 *
 * `Dependency.fromSide`/`toSide` persist as TEMPORAL sides. Storing them physically would
 * make the same JSON render differently per direction and turn a finish-to-start hop into a
 * chart-spanning U-detour on flip. The function is an involution, so it also converts a
 * physical edge back to temporal when storing a newly drawn arrow.
 */
export function resolveAnchorSide<T extends string>(side: T, isRtl: boolean): T {
  if (!isRtl) return side;
  if (side === 'left') return 'right' as T;
  if (side === 'right') return 'left' as T;
  return side;
}


export function getTotalMonths(startYear: number, endYear: number, startMonth = 1, endMonth = 12): number {
  return (endYear - startYear) * 12 + (endMonth - startMonth + 1);
}

export type YearHeader = { year: number; startMonth: number; spanMonths: number };
export type QuarterHeader = { quarter: number; year: number; startMonth: number; spanMonths: number };
export type MonthHeader = { monthIndex: number; monthNumber: number; year: number };

export function buildYearHeaders(startYear: number, endYear: number, chartStartMonth = 1, chartEndMonth = 12): YearHeader[] {
  const headers: YearHeader[] = [];
  let idx = 0;
  for (let year = startYear; year <= endYear; year++) {
    const firstM = year === startYear ? chartStartMonth : 1;
    const lastM = year === endYear ? chartEndMonth : 12;
    const span = lastM - firstM + 1;
    headers.push({ year, startMonth: idx, spanMonths: span });
    idx += span;
  }
  return headers;
}

export function buildQuarterHeaders(startYear: number, endYear: number, chartStartMonth = 1, chartEndMonth = 12): QuarterHeader[] {
  const headers: QuarterHeader[] = [];
  let idx = 0;
  for (let year = startYear; year <= endYear; year++) {
    const firstM = year === startYear ? chartStartMonth : 1;
    const lastM = year === endYear ? chartEndMonth : 12;
    for (let q = 0; q < 4; q++) {
      const qStart = q * 3 + 1; // 1,4,7,10
      const qEnd = qStart + 2;  // 3,6,9,12
      // Intersect quarter with visible range for this year
      const visStart = Math.max(qStart, firstM);
      const visEnd = Math.min(qEnd, lastM);
      if (visStart > visEnd) continue;
      const span = visEnd - visStart + 1;
      headers.push({ quarter: q, year, startMonth: idx, spanMonths: span });
      idx += span;
    }
  }
  return headers;
}

export function buildMonthHeaders(startYear: number, endYear: number, chartStartMonth = 1, chartEndMonth = 12): MonthHeader[] {
  const totalMonths = getTotalMonths(startYear, endYear, chartStartMonth, chartEndMonth);
  const headers: MonthHeader[] = [];
  for (let i = 0; i < totalMonths; i++) {
    const absoluteMonth = (chartStartMonth - 1) + i;
    headers.push({
      monthIndex: i,
      monthNumber: (absoluteMonth % 12) + 1,
      year: startYear + Math.floor(absoluteMonth / 12),
    });
  }
  return headers;
}

export function getCurrentMonthIndex(startYear: number, chartStartMonth = 1): number {
  const now = new Date();
  return (now.getFullYear() - startYear) * 12 + now.getMonth() - (chartStartMonth - 1);
}

// --- Weeks mode utilities ---

/** Get the Monday-based start of the chart's first week (first day of startMonth) */
function getChartWeekStart(startYear: number, startMonth: number): Date {
  return new Date(startYear, startMonth - 1, 1);
}

/** Get the end of the chart's last week (last day of endMonth) */
function getChartWeekEnd(endYear: number, endMonth: number): Date {
  return new Date(endYear, endMonth, 0); // last day of endMonth
}

/** Total number of weeks in the date range (rounded up from days) */
export function getTotalWeeks(startYear: number, endYear: number, startMonth = 1, endMonth = 12): number {
  const start = getChartWeekStart(startYear, startMonth);
  const end = getChartWeekEnd(endYear, endMonth);
  // `+ 1` because both endpoints are inclusive: day 0 is already inside week 0. `ceil` drops
  // the final partial week, rendering 52 weeks for a full year that needs 53.
  return Math.floor(daysBetween(start, end) / 7) + 1;
}

export type WeekMonthHeader = { year: number; month: number; startWeek: number; spanWeeks: number };
export type WeekHeader = { weekNumber: number; weekIndex: number };

/**
 * Build month headers for weeks mode (top tier).
 * Each month spans a certain number of weeks.
 */
export function buildMonthHeadersForWeeks(startYear: number, endYear: number, startMonth = 1, endMonth = 12): WeekMonthHeader[] {
  const chartStart = getChartWeekStart(startYear, startMonth);
  const totalWeeks = getTotalWeeks(startYear, endYear, startMonth, endMonth);

  // Each month's TRUE start week. The previous version accumulated `weekIdx += span`, which
  // counted a week straddling two months once for each of them — twelve headers summed to 63
  // against a true 52, the flex row rescaled every cell, and no month lined up with the week
  // column beneath it.
  const months: { year: number; month: number; startWeek: number }[] = [];
  for (let year = startYear; year <= endYear; year++) {
    const firstM = year === startYear ? startMonth : 1;
    const lastM = year === endYear ? endMonth : 12;
    for (let m = firstM; m <= lastM; m++) {
      months.push({
        year,
        month: m,
        startWeek: Math.floor(daysBetween(chartStart, new Date(year, m - 1, 1)) / 7),
      });
    }
  }

  // Span reaches to the next month's start week, so the spans telescope to exactly
  // `totalWeeks` and a straddling week belongs to precisely one header.
  return months
    .map((mo, i) => ({
      year: mo.year,
      month: mo.month,
      startWeek: mo.startWeek,
      spanWeeks: (months[i + 1]?.startWeek ?? totalWeeks) - mo.startWeek,
    }))
    // A month entirely inside one week has no column of its own; a zero-width flex cell
    // would still consume a border and shift everything after it.
    .filter((h) => h.spanWeeks > 0);
}

/** Get the ISO week number for a given date (1-based, Mon=start) */
function getISOWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / (1000 * 60 * 60 * 24) + 1) / 7);
}

/**
 * Build individual week headers (bottom tier).
 * Labels use calendar week numbers (W1–W52/53) based on the calendar year,
 * not sequential from chart start.
 */
export function buildWeekHeaders(startYear: number, endYear: number, startMonth = 1, endMonth = 12): WeekHeader[] {
  const total = getTotalWeeks(startYear, endYear, startMonth, endMonth);
  const chartStart = getChartWeekStart(startYear, startMonth);
  const headers: WeekHeader[] = [];
  for (let i = 0; i < total; i++) {
    const weekDate = addDays(chartStart, i * 7);
    headers.push({ weekNumber: getISOWeekNumber(weekDate), weekIndex: i });
  }
  return headers;
}

/**
 * Get the current week index relative to chart start.
 * Returns a fractional value where the integer part is the week index
 * and the fractional part is the day-of-week proportion.
 */
export function getCurrentWeekIndex(startYear: number, startMonth = 1): number {
  const now = new Date();
  const chartStart = getChartWeekStart(startYear, startMonth);
  // Fractional on purpose: the integer part is the week, the remainder the day-of-week.
  return daysBetween(chartStart, now) / 7;
}

/**
 * Get the week indices that are at month boundaries (for thicker grid lines).
 * Returns a Set of week indices where a new month starts.
 */
export function getMonthBoundaryWeeks(startYear: number, endYear: number, startMonth = 1, endMonth = 12): Set<number> {
  const boundaries = new Set<number>();
  const chartStart = getChartWeekStart(startYear, startMonth);

  for (let year = startYear; year <= endYear; year++) {
    const firstM = year === startYear ? startMonth : 1;
    const lastM = year === endYear ? endMonth : 12;
    for (let m = firstM; m <= lastM; m++) {
      const monthStart = new Date(year, m - 1, 1);
      const weekIdx = Math.floor(daysBetween(chartStart, monthStart) / 7);
      if (weekIdx > 0) boundaries.add(weekIdx);
    }
  }
  return boundaries;
}

/**
 * Get the week indices that are at year boundaries (for even thicker grid lines).
 */
export function getYearBoundaryWeeks(startYear: number, endYear: number, startMonth = 1): Set<number> {
  const boundaries = new Set<number>();
  const chartStart = getChartWeekStart(startYear, startMonth);

  for (let year = startYear + 1; year <= endYear; year++) {
    const yearStart = new Date(year, 0, 1);
    const weekIdx = Math.floor(daysBetween(chartStart, yearStart) / 7);
    if (weekIdx > 0) boundaries.add(weekIdx);
  }
  return boundaries;
}

export type WeekYearHeader = { year: number; startWeek: number; spanWeeks: number };

/**
 * Year tier for weeks mode.
 *
 * Derived by grouping the month headers rather than recomputing week boundaries, so the
 * three tiers cannot drift out of alignment with each other.
 */
export function buildYearHeadersForWeeks(
  startYear: number,
  endYear: number,
  startMonth = 1,
  endMonth = 12,
): WeekYearHeader[] {
  const months = buildMonthHeadersForWeeks(startYear, endYear, startMonth, endMonth);
  const headers: WeekYearHeader[] = [];
  for (const m of months) {
    const last = headers[headers.length - 1];
    if (last && last.year === m.year) {
      last.spanWeeks += m.spanWeeks;
    } else {
      headers.push({ year: m.year, startWeek: m.startWeek, spanWeeks: m.spanWeeks });
    }
  }
  return headers;
}
