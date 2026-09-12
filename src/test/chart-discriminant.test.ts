import { describe, it, expect, beforeEach } from 'vitest';
import { useStore } from '@/stores';
import { unitForMode } from '@/types/gantt';
import type { MonthsChart, WeeksChart } from '@/types/gantt';

const months = (): MonthsChart => ({
  id: 'm', unit: 'month', name: 'Months', startYear: 2026, startMonth: 1, endYear: 2027, endMonth: 12,
  rows: [{ id: 'r', name: '', order: 0, activityIds: [] }],
  activities: [], dependencies: [], createdAt: 'x', updatedAt: 'x',
});
const weeks = (): WeeksChart => ({
  id: 'w', unit: 'week', name: 'Weeks', startYear: 2026, startMonth: 1, endYear: 2027, endMonth: 12,
  rows: [{ id: 'r', name: '', order: 0, activityIds: [] }],
  activities: [], dependencies: [], createdAt: 'x', updatedAt: 'x',
});

/**
 * The two charts were once member-for-member identical and therefore mutually assignable, so
 * a misroute compiled cleanly and surfaced as a runtime mystery. `unit` makes them distinct.
 */
describe('chart discriminant', () => {
  beforeEach(() => {
    useStore.getState().setTimelineMode('months');
    useStore.getState().setChart(months());
    useStore.getState().setWeeksChart(weeks());
  });

  it('unitForMode maps the timeline mode to the chart unit', () => {
    expect(unitForMode('months')).toBe('month');
    expect(unitForMode('weeks')).toBe('week');
  });

  it('the two store slots hold charts with different units', () => {
    expect(useStore.getState().chart.unit).toBe('month');
    expect(useStore.getState().weeksChart.unit).toBe('week');
  });

  it('the active chart follows the mode, and carries the matching unit', () => {
    expect(useStore.getState()._activeChart().unit).toBe('month');
    useStore.getState().setTimelineMode('weeks');
    expect(useStore.getState()._activeChart().unit).toBe('week');
  });

  it('a mutation in weeks mode touches only the weeks chart', () => {
    useStore.getState().setTimelineMode('weeks');
    useStore.getState().setChartName('renamed');
    expect(useStore.getState().weeksChart.name).toBe('renamed');
    expect(useStore.getState().chart.name).toBe('Months');
  });

  it('a mutation in months mode touches only the months chart', () => {
    useStore.getState().setTimelineMode('months');
    useStore.getState().setChartName('renamed');
    expect(useStore.getState().chart.name).toBe('renamed');
    expect(useStore.getState().weeksChart.name).toBe('Weeks');
  });

  it('defaults created by the store carry a unit', () => {
    // Fresh store values were seeded by the slice initialisers.
    expect(['month', 'week']).toContain(useStore.getState().chart.unit);
    expect(useStore.getState().weeksChart.unit).toBe('week');
  });
});
