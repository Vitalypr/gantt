import { useMemo } from 'react';
import { buildYearHeaders, buildQuarterHeaders, buildMonthHeaders } from '@/utils/timeline';

type TimelineHeaderProps = {
  startYear: number;
  endYear: number;
  chartStartMonth: number;
  chartEndMonth: number;
  monthWidth: number;
  totalWidth: number;
};

const TIER_HEIGHT = 28;

export function TimelineHeader({ startYear, endYear, chartStartMonth, chartEndMonth, monthWidth, totalWidth }: TimelineHeaderProps) {
  const years = useMemo(() => buildYearHeaders(startYear, endYear, chartStartMonth, chartEndMonth), [startYear, endYear, chartStartMonth, chartEndMonth]);
  const quarters = useMemo(() => buildQuarterHeaders(startYear, endYear, chartStartMonth, chartEndMonth), [startYear, endYear, chartStartMonth, chartEndMonth]);
  const months = useMemo(() => buildMonthHeaders(startYear, endYear, chartStartMonth, chartEndMonth), [startYear, endYear, chartStartMonth, chartEndMonth]);

  return (
    <div className="relative border-b bg-background" style={{ width: totalWidth, height: TIER_HEIGHT * 3 }}>
      {/* Year tier */}
      <div className="flex" style={{ height: TIER_HEIGHT }}>
        {years.map((y) => (
          <div
            key={`y-${y.year}`}
            className="flex items-center justify-center border-b border-r text-xs font-semibold text-foreground"
            style={{ width: y.spanMonths * monthWidth, height: TIER_HEIGHT }}
          >
            {y.year}
          </div>
        ))}
      </div>

      {/* Quarter tier */}
      <div className="flex" style={{ height: TIER_HEIGHT }}>
        {quarters.map((q, i) => (
          <div
            key={`q-${i}`}
            className="flex items-center justify-center border-b border-r text-xs text-muted-foreground"
            style={{ width: q.spanMonths * monthWidth, height: TIER_HEIGHT }}
          >
            {monthWidth >= 40 ? q.label : q.label.split(' ')[0]}
          </div>
        ))}
      </div>

      {/* Month tier */}
      <div className="flex" style={{ height: TIER_HEIGHT }}>
        {months.map((m) => (
          <div
            key={m.monthIndex}
            className="flex items-center justify-center border-r text-xs text-muted-foreground"
            style={{ width: monthWidth, height: TIER_HEIGHT }}
          >
            {monthWidth >= 50 ? m.label : m.monthNumber}
          </div>
        ))}
      </div>
    </div>
  );
}
