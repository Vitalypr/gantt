import { describe, it, expect } from 'vitest';
import { resolveRowGroups } from '@/utils/rowGroups';
import type { Activity, GanttRow } from '@/types/gantt';

const row = (id: string, order: number, activityIds: string[] = [], extra: Partial<GanttRow> = {}): GanttRow =>
  ({ id, name: id, order, activityIds, ...extra });
const act = (id: string, startMonth: number, durationMonths: number, extra: Partial<Activity> = {}): Activity =>
  ({ id, name: id, color: '#14b8a6', startMonth, durationMonths, order: 0, ...extra });

describe('resolveRowGroups', () => {
  it('shows every row when nothing is a group', () => {
    const rows = [row('a', 0), row('b', 1)];
    const { visible, rollups } = resolveRowGroups(rows, []);
    expect(visible.map((r) => r.id)).toEqual(['a', 'b']);
    expect(rollups).toEqual([]);
  });

  it('an expanded group hides nothing', () => {
    const rows = [row('g', 0, [], { isGroup: true }), row('a', 1)];
    expect(resolveRowGroups(rows, []).visible.map((r) => r.id)).toEqual(['g', 'a']);
  });

  it('a collapsed group hides its members but keeps the header', () => {
    const rows = [row('g', 0, [], { isGroup: true, collapsed: true }), row('a', 1), row('b', 2)];
    expect(resolveRowGroups(rows, []).visible.map((r) => r.id)).toEqual(['g']);
  });

  it('a group owns rows only until the NEXT group header', () => {
    const rows = [
      row('g1', 0, [], { isGroup: true, collapsed: true }),
      row('a', 1),
      row('g2', 2, [], { isGroup: true }),
      row('b', 3),
    ];
    expect(resolveRowGroups(rows, []).visible.map((r) => r.id)).toEqual(['g1', 'g2', 'b']);
  });

  it('rolls the hidden bars up into one span', () => {
    const rows = [row('g', 0, [], { isGroup: true, collapsed: true }), row('a', 1, ['x']), row('b', 2, ['y'])];
    const activities = [act('x', 2, 3), act('y', 8, 2)];
    const { rollups } = resolveRowGroups(rows, activities);
    expect(rollups).toEqual([{ rowId: 'g', startUnit: 2, spanUnits: 8, hiddenRows: 2 }]);
  });

  it('treats a milestone as one unit long in the rollup', () => {
    const rows = [row('g', 0, [], { isGroup: true, collapsed: true }), row('a', 1, ['m'])];
    const { rollups } = resolveRowGroups(rows, [act('m', 4, 9, { isMilestone: true })]);
    expect(rollups[0]).toMatchObject({ startUnit: 4, spanUnits: 1 });
  });

  it('produces no rollup for a collapsed group whose rows hold no bars', () => {
    const rows = [row('g', 0, [], { isGroup: true, collapsed: true }), row('a', 1)];
    expect(resolveRowGroups(rows, []).rollups).toEqual([]);
  });

  it('ignores activityIds with no activity behind them', () => {
    const rows = [row('g', 0, [], { isGroup: true, collapsed: true }), row('a', 1, ['ghost', 'x'])];
    const { rollups } = resolveRowGroups(rows, [act('x', 1, 2)]);
    expect(rollups[0]).toMatchObject({ startUnit: 1, spanUnits: 2 });
  });

  it('respects row order, not array order', () => {
    // Declared out of order: by `order` this is top(0), g(1, collapsed), member(2).
    const rows = [
      row('member', 2),
      row('g', 1, [], { isGroup: true, collapsed: true }),
      row('top', 0),
    ];
    // `top` precedes the group so it stays visible; `member` follows it and is folded away.
    expect(resolveRowGroups(rows, []).visible.map((r) => r.id)).toEqual(['top', 'g']);
  });

  it('a trailing collapsed group at the end of the chart still rolls up', () => {
    const rows = [row('a', 0), row('g', 1, [], { isGroup: true, collapsed: true }), row('b', 2, ['x'])];
    const { visible, rollups } = resolveRowGroups(rows, [act('x', 0, 4)]);
    expect(visible.map((r) => r.id)).toEqual(['a', 'g']);
    expect(rollups[0]).toMatchObject({ rowId: 'g', hiddenRows: 1 });
  });
});
