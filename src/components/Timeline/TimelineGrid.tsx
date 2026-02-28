import { useMemo } from 'react';
import { useStore } from '@/stores';
import { ROW_SIZE_MAP } from '@/constants/timeline';
import { getMonthBoundaryWeeks, getYearBoundaryWeeks } from '@/utils/timeline';
import type { TimelineMode } from '@/types/gantt';

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
  const rowSize = useStore((s) => s.rowSize);
  const rowHeight = ROW_SIZE_MAP[rowSize];
  const gridWidth = totalUnits * unitWidth;
  const lastRow = rows[rows.length - 1];
  const bottomY = lastRow ? lastRow.y + rowHeight : 0;

  // Months mode: offset to next January
  const offsetToJan = (12 - ((chartStartMonth - 1) % 12)) % 12;

  // Weeks mode: precompute boundary sets
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
        {/* Vertical lines */}
        {Array.from({ length: totalUnits + 1 }, (_, i) => {
          const x = i * unitWidth;
          let isStrong = false;
          let isExtraStrong = false;

          if (timelineMode === 'weeks') {
            isExtraStrong = yearBoundaries.has(i);
            isStrong = !isExtraStrong && monthBoundaries.has(i);
          } else {
            isStrong = i === 0 || ((i - offsetToJan) % 12 === 0 && i >= offsetToJan);
          }

          return (
            <line
              key={i}
              x1={x}
              y1={0}
              x2={x}
              y2={bottomY > 0 ? bottomY : totalHeight}
              stroke={
                isExtraStrong
                  ? 'var(--color-grid-line-strong)'
                  : isStrong
                    ? 'var(--color-grid-line-strong)'
                    : 'var(--color-grid-line)'
              }
              strokeWidth={isExtraStrong ? 1.5 : isStrong ? 1 : 0.5}
            />
          );
        })}

        {/* Horizontal row lines */}
        {rows.map((row) => {
          const y = row.y + rowHeight;
          return (
            <line
              key={`h-${row.rowId}`}
              x1={0}
              y1={y}
              x2={gridWidth}
              y2={y}
              stroke="var(--color-grid-line)"
              strokeWidth={0.5}
            />
          );
        })}

        {/* Bottom border at end of rows */}
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
