import { MONTH_NAMES_SHORT, QUARTER_NAMES } from '@/constants/timeline';

export function getTotalMonths(startYear: number, endYear: number, startMonth = 1, endMonth = 12): number {
  return (endYear - startYear) * 12 + (endMonth - startMonth + 1);
}

export type YearHeader = { year: number; startMonth: number; spanMonths: number };
export type QuarterHeader = { label: string; startMonth: number; spanMonths: number };
export type MonthHeader = { label: string; monthIndex: number; monthNumber: number };

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
      const qName = QUARTER_NAMES[q]!;
      headers.push({ label: `${qName} ${year}`, startMonth: idx, spanMonths: span });
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
    const m = absoluteMonth % 12;
    headers.push({
      label: MONTH_NAMES_SHORT[m]!,
      monthIndex: i,
      monthNumber: m + 1,
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
  const diffDays = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
  return Math.ceil(diffDays / 7);
}

export type WeekMonthHeader = { label: string; startWeek: number; spanWeeks: number };
export type WeekHeader = { label: string; weekIndex: number };

/**
 * Build month headers for weeks mode (top tier).
 * Each month spans a certain number of weeks.
 */
export function buildMonthHeadersForWeeks(startYear: number, endYear: number, startMonth = 1, endMonth = 12): WeekMonthHeader[] {
  const headers: WeekMonthHeader[] = [];
  const chartStart = getChartWeekStart(startYear, startMonth);
  let weekIdx = 0;

  for (let year = startYear; year <= endYear; year++) {
    const firstM = year === startYear ? startMonth : 1;
    const lastM = year === endYear ? endMonth : 12;
    for (let m = firstM; m <= lastM; m++) {
      const monthStart = new Date(year, m - 1, 1);
      const monthEnd = new Date(year, m, 0); // last day of month
      // Calculate week indices for this month
      const startDays = (monthStart.getTime() - chartStart.getTime()) / (1000 * 60 * 60 * 24);
      const endDays = (monthEnd.getTime() - chartStart.getTime()) / (1000 * 60 * 60 * 24);
      const wStart = Math.floor(startDays / 7);
      const wEnd = Math.floor(endDays / 7);
      const span = wEnd - wStart + 1;
      headers.push({
        label: `${MONTH_NAMES_SHORT[m - 1]} ${year}`,
        startWeek: weekIdx,
        spanWeeks: span,
      });
      weekIdx += span;
    }
  }
  return headers;
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
    const weekDate = new Date(chartStart.getTime() + i * 7 * 24 * 60 * 60 * 1000);
    const weekNum = getISOWeekNumber(weekDate);
    headers.push({ label: `W${weekNum}`, weekIndex: i });
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
  const diffDays = (now.getTime() - chartStart.getTime()) / (1000 * 60 * 60 * 24);
  return diffDays / 7;
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
      const daysSinceStart = (monthStart.getTime() - chartStart.getTime()) / (1000 * 60 * 60 * 24);
      const weekIdx = Math.floor(daysSinceStart / 7);
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
    const daysSinceStart = (yearStart.getTime() - chartStart.getTime()) / (1000 * 60 * 60 * 24);
    const weekIdx = Math.floor(daysSinceStart / 7);
    if (weekIdx > 0) boundaries.add(weekIdx);
  }
  return boundaries;
}
