import { useMemo } from 'react';
import {
  buildYearHeaders,
  buildQuarterHeaders,
  buildMonthHeaders,
  buildMonthHeadersForWeeks,
  buildWeekHeaders,
} from '@/utils/timeline';
import type { TimelineMode } from '@/types/gantt';

type TimelineHeaderProps = {
  startYear: number;
  endYear: number;
  chartStartMonth: number;
  chartEndMonth: number;
  unitWidth: number;
  totalWidth: number;
  showQuarters: boolean;
  timelineMode: TimelineMode;
};

const TIER_HEIGHT = 28;

export function TimelineHeader({
  startYear,
  endYear,
  chartStartMonth,
  chartEndMonth,
  unitWidth,
  totalWidth,
  showQuarters,
  timelineMode,
}: TimelineHeaderProps) {
  // Months mode headers
  const years = useMemo(
    () => buildYearHeaders(startYear, endYear, chartStartMonth, chartEndMonth),
    [startYear, endYear, chartStartMonth, chartEndMonth],
  );
  const quarters = useMemo(
    () => buildQuarterHeaders(startYear, endYear, chartStartMonth, chartEndMonth),
    [startYear, endYear, chartStartMonth, chartEndMonth],
  );
  const months = useMemo(
    () => buildMonthHeaders(startYear, endYear, chartStartMonth, chartEndMonth),
    [startYear, endYear, chartStartMonth, chartEndMonth],
  );

  // Weeks mode headers
  const weekMonthHeaders = useMemo(
    () => buildMonthHeadersForWeeks(startYear, endYear, chartStartMonth, chartEndMonth),
    [startYear, endYear, chartStartMonth, chartEndMonth],
  );
  const weekHeaders = useMemo(
    () => buildWeekHeaders(startYear, endYear, chartStartMonth, chartEndMonth),
    [startYear, endYear, chartStartMonth, chartEndMonth],
  );

  if (timelineMode === 'weeks') {
    return (
      <div className="relative border-b bg-background" style={{ width: totalWidth, height: TIER_HEIGHT * 2 }}>
        {/* Month tier (top) */}
        <div className="flex" style={{ height: TIER_HEIGHT }}>
          {weekMonthHeaders.map((mh, i) => (
            <div
              key={`wm-${i}`}
              className="flex items-center justify-center border-b border-r text-xs font-semibold text-foreground overflow-hidden"
              style={{ width: mh.spanWeeks * unitWidth, height: TIER_HEIGHT }}
            >
              {mh.spanWeeks * unitWidth >= 60
                ? mh.label
                : mh.spanWeeks * unitWidth >= 30
                  ? mh.label.split(' ')[0]
                  : ''}
            </div>
          ))}
        </div>

        {/* Week tier (bottom) */}
        <div className="flex" style={{ height: TIER_HEIGHT }}>
          {weekHeaders.map((wh) => (
            <div
              key={wh.weekIndex}
              className="flex items-center justify-center border-r text-xs text-muted-foreground overflow-hidden"
              style={{ width: unitWidth, height: TIER_HEIGHT }}
            >
              {unitWidth >= 30 ? wh.label : unitWidth >= 14 ? wh.weekIndex + 1 : ''}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Months mode (original)
  const tierCount = showQuarters ? 3 : 2;

  return (
    <div className="relative border-b bg-background" style={{ width: totalWidth, height: TIER_HEIGHT * tierCount }}>
      {/* Year tier */}
      <div className="flex" style={{ height: TIER_HEIGHT }}>
        {years.map((y) => (
          <div
            key={`y-${y.year}`}
            className="flex items-center justify-center border-b border-r text-xs font-semibold text-foreground overflow-hidden"
            style={{ width: y.spanMonths * unitWidth, height: TIER_HEIGHT }}
          >
            {y.year}
          </div>
        ))}
      </div>

      {/* Quarter tier */}
      {showQuarters && (
        <div className="flex" style={{ height: TIER_HEIGHT }}>
          {quarters.map((q, i) => (
            <div
              key={`q-${i}`}
              className="flex items-center justify-center border-b border-r text-xs text-muted-foreground overflow-hidden"
              style={{ width: q.spanMonths * unitWidth, height: TIER_HEIGHT }}
            >
              {unitWidth >= 40 ? q.label : unitWidth >= 14 ? q.label.split(' ')[0] : ''}
            </div>
          ))}
        </div>
      )}

      {/* Month tier */}
      <div className="flex" style={{ height: TIER_HEIGHT }}>
        {months.map((m) => (
          <div
            key={m.monthIndex}
            className="flex items-center justify-center border-r text-xs text-muted-foreground overflow-hidden"
            style={{ width: unitWidth, height: TIER_HEIGHT }}
          >
            {unitWidth >= 50 ? m.label : unitWidth >= 14 ? m.monthNumber : ''}
          </div>
        ))}
      </div>
    </div>
  );
}
