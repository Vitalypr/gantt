import { describe, it, expect, beforeEach } from 'vitest';
import { useStore } from '@/stores';
import type { MonthsChart } from '@/types/gantt';

const seed = (): MonthsChart => ({
  id: 'c', unit: 'month', name: 'T', startYear: 2026, startMonth: 1, endYear: 2027, endMonth: 12,
  rows: [
    { id: 'r1', name: '', order: 0, activityIds: ['a1', 'a2'] },
    { id: 'r2', name: '', order: 1, activityIds: [] },
    { id: 'r3', name: '', order: 2, activityIds: [] },
  ],
  activities: [
    { id: 'a1', name: 'A', color: '#14b8a6', startMonth: 2, durationMonths: 3, order: 0 },
    { id: 'a2', name: 'B', color: '#14b8a6', startMonth: 6, durationMonths: 2, order: 1 },
  ],
  dependencies: [{ id: 'd', fromActivityId: 'a1', toActivityId: 'a2', fromSide: 'right', toSide: 'left' }],
  createdAt: 'x', updatedAt: 'x',
});

const st = () => useStore.getState();
const chart = () => useStore.getState().chart;
const temporal = () => (useStore as unknown as {
  temporal: { getState: () => { undo: () => void; clear: () => void; pastStates: unknown[] } };
}).temporal.getState();
const rowOf = (id: string) => chart().rows.find((r) => r.activityIds.includes(id))?.id;

describe('bulk actions are each one commit', () => {
  beforeEach(() => {
    st().setTimelineMode('months');
    st().setChart(seed());
    temporal().clear();
  });

  it('updateActivities restyles the whole selection in one undo entry', () => {
    const before = temporal().pastStates.length;
    st().updateActivities(['a1', 'a2'], { color: '#ef4444' });
    expect(temporal().pastStates.length - before).toBe(1);
    expect(chart().activities.map((a) => a.color)).toEqual(['#ef4444', '#ef4444']);

    temporal().undo();
    expect(chart().activities.map((a) => a.color)).toEqual(['#14b8a6', '#14b8a6']);
  });

  it('removeActivities deletes many, and their dependencies, in one entry', () => {
    const before = temporal().pastStates.length;
    st().removeActivities(['a1', 'a2']);
    expect(temporal().pastStates.length - before).toBe(1);
    expect(chart().activities).toHaveLength(0);
    expect(chart().dependencies).toHaveLength(0);
    expect(chart().rows[0]!.activityIds).toHaveLength(0);
  });

  it('duplicateActivities copies into the same row at an offset', () => {
    const ids = st().duplicateActivities(['a1'], 1);
    expect(ids).toHaveLength(1);
    const copy = chart().activities.find((a) => a.id === ids[0]);
    expect(copy!.startMonth).toBe(3);
    expect(rowOf(ids[0]!)).toBe('r1');
  });

  it('duplicating everything does not copy the copies', () => {
    st().duplicateActivities(['a1', 'a2'], 1);
    expect(chart().activities).toHaveLength(4);
  });

  it('transformActivities nudges, resizes and changes row in one entry each', () => {
    const before = temporal().pastStates.length;
    st().transformActivities(['a1', 'a2'], { units: 2 });
    expect(temporal().pastStates.length - before).toBe(1);
    expect(chart().activities.map((a) => a.startMonth)).toEqual([4, 8]);

    st().transformActivities(['a1'], { duration: 2 });
    expect(chart().activities[0]!.durationMonths).toBe(5);

    st().transformActivities(['a1'], { rows: 1 });
    expect(rowOf('a1')).toBe('r2');
  });

  it('transform clamps rather than escaping the chart or inverting a bar', () => {
    st().transformActivities(['a1'], { units: -999 });
    expect(chart().activities[0]!.startMonth).toBe(0);
    st().transformActivities(['a1'], { duration: -999 });
    expect(chart().activities[0]!.durationMonths).toBe(1);
    st().transformActivities(['a1'], { rows: 99 });
    expect(rowOf('a1')).toBe('r3');
    st().transformActivities(['a1'], { rows: -99 });
    expect(rowOf('a1')).toBe('r1');
  });

  it('a combined transform is still ONE undo entry', () => {
    const before = temporal().pastStates.length;
    st().transformActivities(['a1'], { units: 1, duration: 1, rows: 1 });
    expect(temporal().pastStates.length - before).toBe(1);
    temporal().undo();
    expect(chart().activities[0]!.startMonth).toBe(2);
    expect(chart().activities[0]!.durationMonths).toBe(3);
    expect(rowOf('a1')).toBe('r1');
  });

  it('pasteActivities inserts copies with fresh ids into the target row', () => {
    const source = chart().activities[0]!;
    const ids = st().pasteActivities([source], 'r3');
    expect(ids).toHaveLength(1);
    expect(ids[0]).not.toBe(source.id);
    expect(rowOf(ids[0]!)).toBe('r3');
    expect(chart().activities.find((a) => a.id === ids[0])!.name).toBe('A');
  });

  it('does nothing, and costs no undo entry, for an empty selection', () => {
    const before = temporal().pastStates.length;
    st().updateActivities([], { color: '#000000' });
    st().removeActivities([]);
    st().transformActivities([], { units: 5 });
    expect(temporal().pastStates.length).toBe(before);
  });
});
