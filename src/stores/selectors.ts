import type { StoreState } from './index';
import type { Activity, GanttChart, WeeksChart } from '@/types/gantt';
import { getTotalMonths, getTotalWeeks } from '@/utils/timeline';

/**
 * The chart the UI is currently editing.
 *
 * `GanttChart` and `WeeksChart` are member-for-member identical, so TypeScript cannot catch a
 * misrouted chart. Every read goes through here so the mode branch exists in exactly one
 * place rather than being re-typed at each call site — which is where every mode bug so far
 * has come from.
 */
export function activeChart(state: StoreState): GanttChart | WeeksChart {
  return state.timelineMode === 'weeks' ? state.weeksChart : state.chart;
}

/** Columns in the timeline: months in months mode, weeks in weeks mode. */
export function totalUnits(state: StoreState): number {
  const c = activeChart(state);
  return state.timelineMode === 'weeks'
    ? getTotalWeeks(c.startYear, c.endYear, c.startMonth, c.endMonth)
    : getTotalMonths(c.startYear, c.endYear, c.startMonth, c.endMonth);
}

/** The unit width actually rendered, after the fit-to-viewport floor. */
export function effectiveUnitWidth(state: StoreState): number {
  return state.timelineMode === 'weeks' ? state.effectiveWeekWidth : state.effectiveMonthWidth;
}

/** The raw (user-chosen) unit width, before the fit floor. */
export function rawUnitWidth(state: StoreState): number {
  return state.timelineMode === 'weeks' ? state.weekWidth : state.monthWidth;
}

export function activitiesOf(state: StoreState): Activity[] {
  return activeChart(state).activities;
}

/** Row ids in render order. */
export function orderedRowIds(state: StoreState): string[] {
  return [...activeChart(state).rows].sort((a, b) => a.order - b.order).map((r) => r.id);
}
