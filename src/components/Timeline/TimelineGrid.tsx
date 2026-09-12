import { useMemo } from 'react';
import { useStore } from '@/stores';
import { ROW_SIZE_MAP } from '@/constants/timeline';
import { getMonthBoundaryWeeks, getYearBoundaryWeeks } from '@/utils/timeline';
import type { TimelineMode } from '@/types/gantt';
import { useChartDirection } from '@/hooks/useChartDirection';

type Row = {
  rowId: string;
  y: number;
};

type TimelineGridProps = {
  totalUnits: number;
  unitWidth: number;
  rows: Row[];
  totalHeight: number;
  chartStartMonth: number;
  startYear: number;
  endYear: number;
  endMonth: number;
  timelineMode: TimelineMode;
};

/**
 * Four grid tiers, differentiated by colour AND stroke width.
 *
 * Two tiers drawn in the same colour are one tier: the stroke-colour ternary used to return
 * the same token for both the year and month branches, leaving stroke width as the only
 * difference and collapsing four intended tiers into two.
 */
export function TimelineGrid({
  totalUnits,
  unitWidth,
  rows,
  totalHeight,
  chartStartMonth,
  startYear,
  endYear,
  endMonth,
  timelineMode,
}: TimelineGridProps) {
  const { isRtl } = useChartDirection();
  const rowSize = useStore((s) => s.rowSize);
  const rowHeight = ROW_SIZE_MAP[rowSize];
  const gridWidth = totalUnits * unitWidth;
  const lastRow = rows[rows.length - 1];
  const bottomY = lastRow ? lastRow.y + rowHeight : 0;

  // Months mode: offset to next January
  const offsetToJan = (12 - ((chartStartMonth - 1) % 12)) % 12;

  const monthBoundaries = useMemo(
    () => timelineMode === 'weeks' ? getMonthBoundaryWeeks(startYear, endYear, chartStartMonth, endMonth) : new Set<number>(),
    [timelineMode, startYear, endYear, chartStartMonth, endMonth],
  );
  const yearBoundaries = useMemo(
    () => timelineMode === 'weeks' ? getYearBoundaryWeeks(startYear, endYear, chartStartMonth) : new Set<number>(),
    [timelineMode, startYear, endYear, chartStartMonth],
  );

  return (
    <div className="pointer-events-none absolute inset-0" style={{ height: totalHeight }}>
      <svg className="absolute inset-0" width={gridWidth} height={totalHeight}>
        {/* Vertical lines. `i` is a TEMPORAL boundary index; the x it maps to mirrors in RTL,
            which is what keeps year and month emphasis on the correct edges. */}
        {Array.from({ length: totalUnits + 1 }, (_, i) => {
          const x = (isRtl ? totalUnits - i : i) * unitWidth;

          let isYear = false;
          let isMonth = false;
          if (timelineMode === 'weeks') {
            isYear = yearBoundaries.has(i);
            isMonth = !isYear && monthBoundaries.has(i);
          } else {
            isYear = i === 0 || ((i - offsetToJan) % 12 === 0 && i >= offsetToJan);
            isMonth = !isYear;
          }

          const stroke = isYear
            ? 'var(--color-grid-line-year)'
            : isMonth
              ? 'var(--color-grid-line-strong)'
              : 'var(--color-grid-line)';

          return (
            <line
              key={i}
              x1={x}
              y1={0}
              // Full height, not the last row: a grid that stops partway leaves the rest of
              // the canvas an untextured plane and is the single biggest reason the chart
              // reads as unfinished.
              x2={x}
              y2={totalHeight}
              stroke={stroke}
              strokeWidth={isYear ? 1.5 : isMonth ? 1 : 0.5}
            />
          );
        })}

        {/* Horizontal row lines — the lightest tier. */}
        {rows.map((row) => (
          <line
            key={`h-${row.rowId}`}
            x1={0}
            y1={row.y + rowHeight}
            x2={gridWidth}
            y2={row.y + rowHeight}
            stroke="var(--color-grid-hairline)"
            strokeWidth={0.5}
          />
        ))}

        {/* Where the rows end. */}
        {bottomY > 0 && (
          <line
            x1={0}
            y1={bottomY}
            x2={gridWidth}
            y2={bottomY}
            stroke="var(--color-grid-line-strong)"
            strokeWidth={1}
          />
        )}
      </svg>
    </div>
  );
}
