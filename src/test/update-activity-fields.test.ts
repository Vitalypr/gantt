import { describe, it, expect, beforeEach } from 'vitest';
import { useStore } from '@/stores';
import type { MonthsChart } from '@/types/gantt';

function seed(): MonthsChart {
  const now = new Date().toISOString();
  return {
    id: 'c1', unit: 'month', name: 'T', startYear: 2026, startMonth: 1, endYear: 2027, endMonth: 12,
    rows: [{ id: 'r1', name: '', order: 0, activityIds: ['a1'] }],
    activities: [{ id: 'a1', name: 'A', color: '#3b82f6', startMonth: 0, durationMonths: 2, order: 0 }],
    dependencies: [], createdAt: now, updatedAt: now,
  };
}
const act = () => useStore.getState().chart.activities[0]!;
const temporal = () => (useStore as unknown as {
  temporal: { getState: () => { undo: () => void; redo: () => void; clear: () => void; pastStates: unknown[] } };
}).temporal.getState();

describe('updateActivity carries the frame and font fields', () => {
  beforeEach(() => {
    useStore.getState().setTimelineMode('months');
    useStore.getState().setChart(seed());
    temporal().clear();
  });

  it('persists outlineColor', () => {
    useStore.getState().updateActivity('a1', { outlineColor: '#ef4444' });
    expect(act().outlineColor).toBe('#ef4444');
  });

  it('persists fontSize', () => {
    useStore.getState().updateActivity('a1', { fontSize: 14 });
    expect(act().fontSize).toBe(14);
  });

  it('resets outlineColor to undefined — "follow the theme"', () => {
    useStore.getState().updateActivity('a1', { outlineColor: '#ef4444' });
    useStore.getState().updateActivity('a1', { outlineColor: undefined });
    expect(act().outlineColor).toBeUndefined();
  });

  it('resets fontSize to undefined', () => {
    useStore.getState().updateActivity('a1', { fontSize: 18 });
    useStore.getState().updateActivity('a1', { fontSize: undefined });
    expect(act().fontSize).toBeUndefined();
  });

  it('each change is one undo entry, and undo/redo round-trips', () => {
    const before = temporal().pastStates.length;
    useStore.getState().updateActivity('a1', { outlineColor: '#ef4444' });
    expect(temporal().pastStates.length - before).toBe(1);

    temporal().undo();
    expect(act().outlineColor).toBeUndefined();
    temporal().redo();
    expect(act().outlineColor).toBe('#ef4444');
  });
});
