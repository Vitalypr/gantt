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

export type TopicBands = {
  cells: TopicCell[];
  /** Rows that a gap is drawn ABOVE. Never contains the first row. */
  gapBefore: Set<string>;
};

/**
 * The topic column's cells, and where the gaps between topics fall.
 *
 * A cell runs from a row carrying a `topic` through every following row joined to it by
 * `topicMergedWithNext`. A gap separates two adjacent rows whenever they sit in different
 * cells AND at least one of them is inside a topic — so a chart with no topics gets no gaps
 * at all, and a lone untopiced row between two topics reads as its own block.
 *
 * Pure and separate from the components because "which rows does this cell cover" is exactly
 * the rule that goes wrong at the ends, and because the sidebar, the canvas and the row
 * layout must all agree on it to the pixel.
 */
export function resolveTopicBands(rows: GanttRow[]): TopicBands {
  const cells: TopicCell[] = [];
  const gapBefore = new Set<string>();

  // Cell index per row: rows in the same cell share a number, untopiced rows get their own.
  const cellOf: number[] = [];
  const inTopic: boolean[] = [];

  let i = 0;
  let cellIndex = 0;
  while (i < rows.length) {
    const row = rows[i]!;
    const label = row.topic?.trim() ?? '';

    if (label === '') {
      cellOf[i] = cellIndex++;
      inTopic[i] = false;
      i += 1;
      continue;
    }

    let span = 1;
    // The flag lives on the row that joins DOWNWARD, so the run ends at the first row that
    // does not set it.
    while (rows[i + span - 1]!.topicMergedWithNext && i + span < rows.length) span += 1;

    for (let k = 0; k < span; k++) {
      cellOf[i + k] = cellIndex;
      inTopic[i + k] = true;
    }
    cells.push({ leaderRowId: row.id, label, startIndex: i, span });
    cellIndex += 1;
    i += span;
  }

  for (let k = 1; k < rows.length; k++) {
    const differentCell = cellOf[k] !== cellOf[k - 1];
    if (differentCell && (inTopic[k] || inTopic[k - 1])) gapBefore.add(rows[k]!.id);
  }

  return { cells, gapBefore };
}

/** True when any row carries a topic — the column is not rendered otherwise. */
export function hasAnyTopic(rows: GanttRow[]): boolean {
  return rows.some((r) => (r.topic?.trim() ?? '') !== '');
}
