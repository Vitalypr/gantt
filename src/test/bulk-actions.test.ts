import { describe, it, expect, beforeEach } from 'vitest';
import { useStore } from '@/stores';
import type { MonthsChart } from '@/types/gantt';
import { FORMAT_FIELDS, formatOf, formatDiffers } from '@/utils/activity';

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

/**
 * The format painter follows the Office model: pick a format up from one bar, paint it onto
 * another. What is asserted here is the part that is not the button — which fields travel,
 * that a paste is a single undo entry, and that arming is a mode outside the chart.
 */
describe('format painter', () => {
  beforeEach(() => {
    useStore.getState().setChart(seed());
    useStore.getState().disarmFormatPainter();
  });

  const source = () => chart().activities.find((a) => a.id === 'a1')!;
  const target = () => chart().activities.find((a) => a.id === 'a2')!;

  it('carries fill, frame, text colour and font size, and nothing else', () => {
    expect([...FORMAT_FIELDS]).toEqual(['color', 'outlineColor', 'labelColor', 'fontSize']);
  });

  it('copies every format field onto the target', () => {
    st().updateActivity('a1', {
      color: '#f59e0b', outlineColor: '#ef4444', labelColor: '#ffffff', fontSize: 14,
    });
    st().updateActivities(['a2'], formatOf(source()));
    for (const f of FORMAT_FIELDS) expect(target()[f]).toBe(source()[f]);
  });

  it('leaves position, name and everything else alone', () => {
    st().updateActivity('a1', { color: '#f59e0b', fontSize: 16 });
    const before = { ...target() };
    st().updateActivities(['a2'], formatOf(source()));
    const after = target();
    expect(after.name).toBe(before.name);
    expect(after.startMonth).toBe(before.startMonth);
    expect(after.durationMonths).toBe(before.durationMonths);
  });

  it('carries an unset field as unset, so "automatic" is copied too', () => {
    st().updateActivity('a2', { labelColor: '#ef4444', outlineColor: '#000000' });
    st().updateActivities(['a2'], formatOf(source()));
    expect(target().labelColor).toBeUndefined();
    expect(target().outlineColor).toBeUndefined();
  });

  it('is one undo entry per paste', () => {
    st().updateActivity('a1', { color: '#f59e0b', fontSize: 14 });
    temporal().clear();
    st().updateActivities(['a2'], formatOf(source()));
    expect(temporal().pastStates.length).toBe(1);
  });

  it('reports whether a paste would change anything', () => {
    expect(formatDiffers(target(), formatOf(source()))).toBe(false);
    st().updateActivity('a1', { color: '#f59e0b' });
    expect(formatDiffers(target(), formatOf(source()))).toBe(true);
  });

  it('arms once or sticky, and disarms', () => {
    st().armFormatPainter(formatOf(source()), false);
    expect(useStore.getState().formatPainter?.sticky).toBe(false);
    st().armFormatPainter(formatOf(source()), true);
    expect(useStore.getState().formatPainter?.sticky).toBe(true);
    st().disarmFormatPainter();
    expect(useStore.getState().formatPainter).toBeNull();
  });

  it('arming is not a chart change, so it costs no undo', () => {
    temporal().clear();
    st().armFormatPainter(formatOf(source()), true);
    expect(temporal().pastStates.length).toBe(0);
  });
});
