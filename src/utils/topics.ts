import type { GanttRow } from '@/types/gantt';

/** One cell of the topic column, spanning `span` consecutive rows. */
export type TopicCell = {
  /** Row the cell starts on. */
  leaderRowId: string;
  label: string;
  /** Index of the leader in the visible-row list. */
  startIndex: number;
  span: number;
};

/**
 * The topic column's cells.
 *
 * A cell runs from a row carrying a `topic` through every following row joined to it by
 * `topicMergedWithNext`. Rows with no topic get no cell.
 *
 * Pure and separate from the components because "which rows does this cell cover" is exactly
 * the rule that goes wrong at the ends, and because the column and the row layout must agree
 * on it to the pixel.
 */
export function resolveTopicBands(rows: GanttRow[]): { cells: TopicCell[] } {
  const cells: TopicCell[] = [];

  let i = 0;
  while (i < rows.length) {
    const row = rows[i]!;
    const label = row.topic?.trim() ?? '';

    if (label === '') {
      i += 1;
      continue;
    }

    let span = 1;
    // The flag lives on the row that joins DOWNWARD, so the run ends at the first row that
    // does not set it.
    while (rows[i + span - 1]!.topicMergedWithNext && i + span < rows.length) span += 1;

    cells.push({ leaderRowId: row.id, label, startIndex: i, span });
    i += span;
  }

  return { cells };
}

/** True when any row carries a topic — the column is not rendered otherwise. */
export function hasAnyTopic(rows: GanttRow[]): boolean {
  return rows.some((r) => (r.topic?.trim() ?? '') !== '');
}
