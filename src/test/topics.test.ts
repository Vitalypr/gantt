import { describe, it, expect, beforeEach } from 'vitest';
import { useStore } from '@/stores';
import { resolveTopicBands, hasAnyTopic } from '@/utils/topics';
import type { GanttRow, MonthsChart } from '@/types/gantt';

const row = (id: string, extra: Partial<GanttRow> = {}): GanttRow => ({
  id,
  name: id,
  order: 0,
  activityIds: [],
  ...extra,
});

describe('resolveTopicBands', () => {
  it('gives a lone topic row a cell of span 1', () => {
    const { cells } = resolveTopicBands([row('a', { topic: 'Design' })]);
    expect(cells).toEqual([{ leaderRowId: 'a', label: 'Design', startIndex: 0, span: 1 }]);
  });

  it('spans a cell across rows joined downward', () => {
    const rows = [
      row('a', { topic: 'Design', topicMergedWithNext: true }),
      row('b', { topicMergedWithNext: true }),
      row('c'),
    ];
    expect(resolveTopicBands(rows).cells).toEqual([
      { leaderRowId: 'a', label: 'Design', startIndex: 0, span: 3 },
    ]);
  });

  it('stops the run at the first row that does not join downward', () => {
    const rows = [
      row('a', { topic: 'Design', topicMergedWithNext: true }),
      row('b'),
      row('c', { topic: 'Build' }),
    ];
    const { cells } = resolveTopicBands(rows);
    expect(cells.map((c) => [c.leaderRowId, c.span])).toEqual([['a', 2], ['c', 1]]);
  });

  it('does not run a cell off the end when the last row still joins downward', () => {
    const rows = [
      row('a', { topic: 'Design', topicMergedWithNext: true }),
      row('b', { topicMergedWithNext: true }),
    ];
    const { cells } = resolveTopicBands(rows);
    expect(cells[0]!.span).toBe(2);
  });

  it('treats a blank or whitespace topic as no topic', () => {
    const { cells } = resolveTopicBands([row('a', { topic: '   ' }), row('b', { topic: '' })]);
    expect(cells).toEqual([]);
  });

  it('ignores a merge flag on a row that carries no topic', () => {
    const rows = [row('a', { topicMergedWithNext: true }), row('b')];
    expect(resolveTopicBands(rows).cells).toEqual([]);
  });
});

describe('hasAnyTopic', () => {
  it('is false for an untouched chart, so the column stays hidden', () => {
    expect(hasAnyTopic([row('a'), row('b')])).toBe(false);
    expect(hasAnyTopic([row('a', { topic: '  ' })])).toBe(false);
  });

  it('is true as soon as one row carries a topic', () => {
    expect(hasAnyTopic([row('a'), row('b', { topic: 'Build' })])).toBe(true);
  });
});

describe('topic mutators', () => {
  const seed = (): MonthsChart => ({
    id: 'c', unit: 'month', name: 'T',
    startYear: 2026, startMonth: 1, endYear: 2026, endMonth: 12,
    rows: [
      { id: 'r1', name: '', order: 0, activityIds: [] },
      { id: 'r2', name: '', order: 1, activityIds: [] },
      { id: 'r3', name: '', order: 2, activityIds: [] },
    ],
    activities: [], dependencies: [], createdAt: 'x', updatedAt: 'x',
  });

  const rowsOf = () => useStore.getState().chart.rows;

  beforeEach(() => {
    useStore.getState().setChart(seed());
  });

  it('sets and trims a topic', () => {
    useStore.getState().setRowTopic('r1', '  Design  ');
    expect(rowsOf()[0]!.topic).toBe('Design');
  });

  it('clears to undefined rather than an empty string, so the column can disappear', () => {
    useStore.getState().setRowTopic('r1', 'Design');
    useStore.getState().setRowTopic('r1', '');
    expect(rowsOf()[0]!.topic).toBeUndefined();
  });

  it('drops the merge flag when the topic is cleared', () => {
    useStore.getState().setRowTopic('r1', 'Design');
    useStore.getState().toggleRowTopicMerge('r1');
    useStore.getState().setRowTopic('r1', '');
    expect(rowsOf()[0]!.topicMergedWithNext).toBeUndefined();
  });

  it('joins and splits a topic cell', () => {
    useStore.getState().toggleRowTopicMerge('r1');
    expect(rowsOf()[0]!.topicMergedWithNext).toBe(true);
    useStore.getState().toggleRowTopicMerge('r1');
    expect(rowsOf()[0]!.topicMergedWithNext).toBeUndefined();
  });

  it('clears a follower label on join, since the cell shows the leader label', () => {
    useStore.getState().setRowTopic('r1', 'Design');
    useStore.getState().setRowTopic('r2', 'Stray');
    useStore.getState().toggleRowTopicMerge('r1');
    expect(rowsOf()[1]!.topic).toBeUndefined();
  });

  it('refuses to join the last row, which has nothing below it', () => {
    useStore.getState().toggleRowTopicMerge('r3');
    expect(rowsOf()[2]!.topicMergedWithNext).toBeUndefined();
  });

  it('leaves name merging alone — the two are separate', () => {
    useStore.getState().toggleRowTopicMerge('r1');
    expect(rowsOf()[0]!.mergedWithNext).toBeUndefined();
  });
});

/**
 * Dragging a topic cell's edge is the same gesture as dragging a bar's row span, so it gets
 * the same shape: one compound action, one undo entry, and the released rows cleaned up.
 */
describe('setTopicSpan', () => {
  const seed = (): MonthsChart => ({
    id: 'c', unit: 'month', name: 'T',
    startYear: 2026, startMonth: 1, endYear: 2026, endMonth: 12,
    rows: Array.from({ length: 6 }, (_, i) => ({
      id: `r${i + 1}`, name: '', order: i, activityIds: [],
    })),
    activities: [], dependencies: [], createdAt: 'x', updatedAt: 'x',
  });

  const rowsOf = () => useStore.getState().chart.rows;
  const cells = () => resolveTopicBands(rowsOf()).cells.map((c) => [c.leaderRowId, c.label, c.span]);

  beforeEach(() => {
    useStore.getState().setChart(seed());
  });

  it('covers exactly the rows asked for', () => {
    useStore.getState().setRowTopic('r1', 'Design');
    useStore.getState().setTopicSpan('r1', 3);
    expect(cells()).toEqual([['r1', 'Design', 3]]);
  });

  it('names an unlabelled row, so one drag both creates and sizes the cell', () => {
    useStore.getState().setTopicSpan('r2', 2);
    expect(cells()).toEqual([['r2', 'Topic', 2]]);
  });

  it('keeps the label when resizing', () => {
    useStore.getState().setRowTopic('r1', 'Design');
    useStore.getState().setTopicSpan('r1', 4);
    useStore.getState().setTopicSpan('r1', 2);
    expect(cells()).toEqual([['r1', 'Design', 2]]);
  });

  it('releases the rows a shrink gives up, flags and all', () => {
    useStore.getState().setRowTopic('r1', 'Design');
    useStore.getState().setTopicSpan('r1', 5);
    useStore.getState().setTopicSpan('r1', 2);
    for (const id of ['r3', 'r4', 'r5']) {
      const row = rowsOf().find((r) => r.id === id)!;
      expect(row.topicMergedWithNext, `${id} kept a merge flag`).toBeUndefined();
      expect(row.topic, `${id} kept a label`).toBeUndefined();
    }
  });

  it('does not let a shrink re-chain released rows into the next cell', () => {
    useStore.getState().setRowTopic('r1', 'Design');
    useStore.getState().setTopicSpan('r1', 4);
    useStore.getState().setRowTopic('r5', 'Build');
    useStore.getState().setTopicSpan('r1', 2);
    expect(cells()).toEqual([['r1', 'Design', 2], ['r5', 'Build', 1]]);
  });

  it('clears a follower label swallowed by a grow', () => {
    useStore.getState().setRowTopic('r1', 'Design');
    useStore.getState().setRowTopic('r3', 'Stray');
    useStore.getState().setTopicSpan('r1', 4);
    expect(cells()).toEqual([['r1', 'Design', 4]]);
  });

  it('clamps at the ends rather than running off them', () => {
    useStore.getState().setRowTopic('r5', 'Late');
    useStore.getState().setTopicSpan('r5', 99);
    expect(cells()).toEqual([['r5', 'Late', 2]]);
    useStore.getState().setTopicSpan('r5', 0);
    expect(cells()).toEqual([['r5', 'Late', 1]]);
  });

  it('is one commit, so a drag costs one undo', () => {
    // `getState()` is a snapshot — re-read it after the action or `pastStates` is the count
    // from before the clear.
    const temporal = () => (useStore as unknown as {
      temporal: { getState: () => { pastStates: unknown[]; clear: () => void } };
    }).temporal.getState();
    temporal().clear();
    useStore.getState().setTopicSpan('r1', 4);
    expect(temporal().pastStates.length).toBe(1);
  });
});
