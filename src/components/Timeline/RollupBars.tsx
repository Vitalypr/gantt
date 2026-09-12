import type { RowLayout } from '@/components/GanttChart/GanttChart';
import type { RowRollup } from '@/utils/rowGroups';
import { unitSpanToLeft } from '@/utils/timeline';
import { useChartDirection } from '@/hooks/useChartDirection';

type RollupBarsProps = {
  rollups: RowRollup[];
  rows: RowLayout[];
  unitWidth: number;
  totalUnits: number;
  rowHeight: number;
};

/**
 * The bracket a collapsed phase shows in place of its hidden rows.
 *
 * Drawn as a bracket rather than a filled bar so it never reads as a real activity: it is a
 * summary of rows that are folded away, and a solid bar would invite someone to drag it.
 */
export function RollupBars({ rollups, rows, unitWidth, totalUnits, rowHeight }: RollupBarsProps) {
  const { isRtl } = useChartDirection();
  if (rollups.length === 0) return null;

  const yOf = new Map(rows.map((r) => [r.rowId, r.y]));

  return (
    <div className="pointer-events-none absolute inset-0">
      {rollups.map((rollup) => {
        const y = yOf.get(rollup.rowId);
        if (y === undefined) return null;
        const left = unitSpanToLeft(rollup.startUnit, rollup.spanUnits, unitWidth, totalUnits, isRtl);
        return (
          <div
            key={rollup.rowId}
            data-rollup-bar
            title={`${rollup.hiddenRows} row${rollup.hiddenRows === 1 ? '' : 's'} collapsed`}
            className="absolute"
            style={{
              left,
              width: rollup.spanUnits * unitWidth,
              top: y + rowHeight / 2 - 5,
              height: 10,
              borderTop: '2px solid var(--color-muted-foreground)',
              borderLeft: '2px solid var(--color-muted-foreground)',
              borderRight: '2px solid var(--color-muted-foreground)',
              opacity: 0.75,
            }}
          />
        );
      })}
    </div>
  );
}
