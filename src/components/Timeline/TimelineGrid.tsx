import { ROW_HEIGHT } from '@/constants/timeline';

type Row = {
  rowId: string;
  y: number;
};

type TimelineGridProps = {
  totalMonths: number;
  monthWidth: number;
  rows: Row[];
  totalHeight: number;
  chartStartMonth: number;
};

export function TimelineGrid({ totalMonths, monthWidth, rows, totalHeight, chartStartMonth }: TimelineGridProps) {
  const gridWidth = totalMonths * monthWidth;
  // Bottom border: at the end of the last row
  const lastRow = rows[rows.length - 1];
  const bottomY = lastRow ? lastRow.y + ROW_HEIGHT : 0;

  // Months until next January from chart start (0-based month index)
  const offsetToJan = (12 - ((chartStartMonth - 1) % 12)) % 12;

  return (
    <div className="pointer-events-none absolute inset-0" style={{ height: totalHeight }}>
      <svg className="absolute inset-0" width={gridWidth} height={totalHeight}>
        {/* Vertical month lines - only draw up to row area */}
        {Array.from({ length: totalMonths + 1 }, (_, i) => {
          const x = i * monthWidth;
          const isYearBoundary = i === 0 || (i - offsetToJan) % 12 === 0 && i >= offsetToJan;
          return (
            <line
              key={i}
              x1={x}
              y1={0}
              x2={x}
              y2={bottomY > 0 ? bottomY : totalHeight}
              stroke={isYearBoundary ? 'var(--color-grid-line-strong)' : 'var(--color-grid-line)'}
              strokeWidth={isYearBoundary ? 1 : 0.5}
            />
          );
        })}

        {/* Horizontal row lines */}
        {rows.map((row) => {
          const y = row.y + ROW_HEIGHT;
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
