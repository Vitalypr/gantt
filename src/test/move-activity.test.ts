import { describe, it, expect, beforeEach } from 'vitest';
import { useStore } from '@/stores';
import type { MonthsChart } from '@/types/gantt';

function chartWith(): MonthsChart {
  const now = new Date().toISOString();
  return {
    id: 'c1', unit: 'month', name: 'T', startYear: 2026, startMonth: 1, endYear: 2027, endMonth: 12,
    rows: [
      { id: 'r1', name: 'One', order: 0, activityIds: ['a1'] },
      { id: 'r2', name: 'Two', order: 1, activityIds: [] },
      { id: 'r3', name: 'Three', order: 2, activityIds: [] },
    ],
    activities: [{ id: 'a1', name: 'A', color: '#3b82f6', startMonth: 2, durationMonths: 3, order: 0 }],
    dependencies: [],
    createdAt: now, updatedAt: now,
  };
}

const rowOf = (id: string) => useStore.getState().chart.rows.find((r) => r.activityIds.includes(id))?.id;
const act = () => useStore.getState().chart.activities[0]!;
const historySize = () =>
  (useStore as unknown as { temporal: { getState: () => { pastStates: unknown[] } } })
    .temporal.getState().pastStates.length;

describe('moveActivity', () => {
  beforeEach(() => {
    useStore.getState().setTimelineMode('months');
    useStore.getState().setChart(chartWith());
    (useStore as unknown as { temporal: { getState: () => { clear: () => void } } }).temporal.getState().clear();
  });

  it('moves month and row together', () => {
    useStore.getState().moveActivity('a1', 7, 'r3');
    expect(act().startMonth).toBe(7);
    expect(rowOf('a1')).toBe('r3');
  });

  it('costs exactly ONE undo entry for a diagonal move', () => {
    const before = historySize();
    useStore.getState().moveActivity('a1', 7, 'r3');
    expect(historySize() - before).toBe(1);
  });

  it('a single Ctrl+Z restores BOTH month and row', () => {
    useStore.getState().moveActivity('a1', 7, 'r3');
    (useStore as unknown as { temporal: { getState: () => { undo: () => void } } }).temporal.getState().undo();
    expect(act().startMonth).toBe(2);
    expect(rowOf('a1')).toBe('r1');
  });

  it('does not duplicate the id when the row is unchanged', () => {
    useStore.getState().moveActivity('a1', 5, 'r1');
    const r1 = useStore.getState().chart.rows.find((r) => r.id === 'r1')!;
    expect(r1.activityIds).toEqual(['a1']);
  });

  it('clamps a negative start to 0', () => {
    useStore.getState().moveActivity('a1', -4, 'r2');
    expect(act().startMonth).toBe(0);
  });

  it('leaves the activity attached when the target row does not exist', () => {
    useStore.getState().moveActivity('a1', 3, 'nope');
    expect(rowOf('a1')).toBe('r1');
    expect(act().startMonth).toBe(3);
  });

  it('routes to weeksChart in weeks mode, leaving the months chart untouched', () => {
    useStore.getState().setTimelineMode('weeks');
    const monthsBefore = useStore.getState().chart.activities[0]!.startMonth;
    useStore.getState().moveActivity('a1', 9, 'r2');
    expect(useStore.getState().chart.activities[0]!.startMonth).toBe(monthsBefore);
  });
});
