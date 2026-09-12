import type { Activity, GanttRow } from '@/types/gantt';

export type RowRollup = {
  /** Group row that owns this rollup. */
  rowId: string;
  startUnit: number;
  spanUnits: number;
  /** How many rows are folded away underneath. */
  hiddenRows: number;
};

export type RowVisibility = {
  /** Rows to render, in order. */
  visible: GanttRow[];
  /** One entry per collapsed group that actually has something to summarise. */
  rollups: RowRollup[];
};

/**
 * Which rows are visible, and what a collapsed group summarises.
 *
 * A group row owns every row after it up to the next group row. Collapsing hides those rows
 * and replaces their bars with a single bracket spanning the earliest start to the latest
 * end, so a 40-row chart can be read at phase level without losing where the work sits.
 *
 * Pure, and separate from the component, because the rule "a group owns the rows until the
 * next group" is exactly the kind of thing that goes subtly wrong at the ends.
 */
export function resolveRowGroups(rows: GanttRow[], activities: Activity[]): RowVisibility {
  const ordered = [...rows].sort((a, b) => a.order - b.order);
  const byId = new Map(activities.map((a) => [a.id, a]));

  const visible: GanttRow[] = [];
  const rollups: RowRollup[] = [];

  let owner: GanttRow | null = null;
  let hiddenIds: string[] = [];
  let hiddenCount = 0;

  const flush = () => {
    if (!owner || hiddenCount === 0) return;
    let min = Infinity;
    let max = -Infinity;
    for (const id of hiddenIds) {
      const a = byId.get(id);
      if (!a) continue;
      const end = a.startMonth + (a.isMilestone ? 1 : a.durationMonths);
      if (a.startMonth < min) min = a.startMonth;
      if (end > max) max = end;
    }
    // A group whose members hold no bars has nothing to summarise; a zero-width bracket
    // would just be a stray mark.
    if (min !== Infinity && max > min) {
      rollups.push({ rowId: owner.id, startUnit: min, spanUnits: max - min, hiddenRows: hiddenCount });
    }
    hiddenIds = [];
    hiddenCount = 0;
  };

  for (const row of ordered) {
    if (row.isGroup) {
      flush();
      owner = row.collapsed ? row : null;
      visible.push(row);
      continue;
    }
    if (owner) {
      hiddenIds.push(...row.activityIds);
      hiddenCount++;
    } else {
      visible.push(row);
    }
  }
  flush();

  return { visible, rollups };
}
