import { describe, it, expect } from 'vitest';
import { normalizeChart } from '@/utils/persistence';
import type { MonthsChart } from '@/types/gantt';

const base = (over: Partial<MonthsChart> = {}): MonthsChart => ({
  id: 'c', unit: 'month', name: 'n', startYear: 2026, startMonth: 1, endYear: 2027, endMonth: 12,
  rows: [], activities: [], dependencies: [],
  createdAt: 'x', updatedAt: 'x', ...over,
});
const act = (id: string, over = {}) => ({
  id, name: id, color: '#14b8a6', startMonth: 0, durationMonths: 1, order: 0, ...over,
});

describe('normalizeChart', () => {
  it('drops dependencies whose endpoints are gone', () => {
    const c = normalizeChart(base({
      rows: [{ id: 'r1', name: '', order: 0, activityIds: ['a1'] }],
      activities: [act('a1')],
      dependencies: [
        { id: 'd1', fromActivityId: 'a1', toActivityId: 'ghost', fromSide: 'right', toSide: 'left' },
        { id: 'd2', fromActivityId: 'gone', toActivityId: 'a1', fromSide: 'right', toSide: 'left' },
      ],
    }));
    expect(c.dependencies).toHaveLength(0);
  });

  it('drops a self-dependency', () => {
    const c = normalizeChart(base({
      rows: [{ id: 'r1', name: '', order: 0, activityIds: ['a1'] }],
      activities: [act('a1')],
      dependencies: [{ id: 'd', fromActivityId: 'a1', toActivityId: 'a1', fromSide: 'right', toSide: 'left' }],
    }));
    expect(c.dependencies).toHaveLength(0);
  });

  it('drops activityIds that name no activity', () => {
    const c = normalizeChart(base({
      rows: [{ id: 'r1', name: '', order: 0, activityIds: ['a1', 'ghost'] }],
      activities: [act('a1')],
    }));
    expect(c.rows[0]!.activityIds).toEqual(['a1']);
  });

  it('adopts an orphan activity so it is not invisible', () => {
    const c = normalizeChart(base({
      rows: [{ id: 'r1', name: '', order: 0, activityIds: [] }],
      activities: [act('a1')],
    }));
    expect(c.rows[0]!.activityIds).toEqual(['a1']);
  });

  it('creates a row when an orphan has nowhere to go', () => {
    const c = normalizeChart(base({ rows: [], activities: [act('a1')] }));
    expect(c.rows).toHaveLength(1);
    expect(c.rows[0]!.activityIds).toEqual(['a1']);
  });

  it('lets only one row claim an activity', () => {
    const c = normalizeChart(base({
      rows: [
        { id: 'r1', name: '', order: 0, activityIds: ['a1'] },
        { id: 'r2', name: '', order: 1, activityIds: ['a1'] },
      ],
      activities: [act('a1')],
    }));
    expect(c.rows[0]!.activityIds.concat(c.rows[1]!.activityIds)).toEqual(['a1']);
  });

  it('clamps rowSpan to the rows actually beneath', () => {
    const c = normalizeChart(base({
      rows: [
        { id: 'r1', name: '', order: 0, activityIds: [] },
        { id: 'r2', name: '', order: 1, activityIds: ['a1'] },
      ],
      activities: [act('a1', { rowSpan: 99 })],
    }));
    expect(c.activities[0]!.rowSpan).toBe(1);
  });

  it('clamps a negative startMonth and a zero duration', () => {
    const c = normalizeChart(base({
      rows: [{ id: 'r1', name: '', order: 0, activityIds: ['a1'] }],
      activities: [act('a1', { startMonth: -7, durationMonths: 0 })],
    }));
    expect(c.activities[0]!.startMonth).toBe(0);
    expect(c.activities[0]!.durationMonths).toBe(1);
  });

  it('clears mergedWithNext on the last row, which merges with nothing', () => {
    const c = normalizeChart(base({
      rows: [{ id: 'r1', name: '', order: 0, activityIds: [], mergedWithNext: true }],
    }));
    expect(c.rows[0]!.mergedWithNext).toBeUndefined();
  });

  it('renumbers row order densely from zero', () => {
    const c = normalizeChart(base({
      rows: [
        { id: 'r1', name: '', order: 40, activityIds: [] },
        { id: 'r2', name: '', order: 5, activityIds: [] },
      ],
    }));
    expect(c.rows.map((r) => [r.id, r.order])).toEqual([['r2', 0], ['r1', 1]]);
  });

  it('is idempotent', () => {
    const once = normalizeChart(base({
      rows: [{ id: 'r1', name: '', order: 3, activityIds: ['a1', 'ghost'] }],
      activities: [act('a1', { rowSpan: 9 })],
      dependencies: [{ id: 'd', fromActivityId: 'a1', toActivityId: 'x', fromSide: 'right', toSide: 'left' }],
    }));
    expect(normalizeChart(once)).toEqual(once);
  });

  it('survives missing arrays entirely', () => {
    expect(() => normalizeChart({ ...base(), rows: undefined as never, activities: undefined as never }))
      .not.toThrow();
  });
});
