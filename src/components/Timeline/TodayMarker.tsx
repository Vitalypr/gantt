import { getCurrentMonthIndex, getCurrentWeekIndex, unitSpanToLeft } from '@/utils/timeline';
import type { TimelineMode } from '@/types/gantt';
import { useChartDirection } from '@/hooks/useChartDirection';

type TodayMarkerProps = {
  startYear: number;
  chartStartMonth?: number;
  unitWidth: number;
  totalUnits: number;
  totalHeight: number;
  timelineMode: TimelineMode;
};

export function TodayMarker({ startYear, chartStartMonth = 1, unitWidth, totalUnits, totalHeight, timelineMode }: TodayMarkerProps) {
  const { isRtl } = useChartDirection();
  // Fractional unit offset of "now"; mirrored through the same choke point as the bars.
  let unitOffset: number;

  if (timelineMode === 'weeks') {
    const weekIndex = getCurrentWeekIndex(startYear, chartStartMonth);
    if (weekIndex < 0 || weekIndex > totalUnits) return null;
    unitOffset = weekIndex;
  } else {
    const todayIndex = getCurrentMonthIndex(startYear, chartStartMonth);
    if (todayIndex < 0) return null;
    // Calculate proportional position within the current month
    const now = new Date();
    const dayOfMonth = now.getDate();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const fractionOfMonth = (dayOfMonth - 1) / daysInMonth;
    if (todayIndex > totalUnits) return null;
    unitOffset = todayIndex + fractionOfMonth;
  }

  // Zero-width span: the marker is a line at an instant, not a column.
  const x = unitSpanToLeft(unitOffset, 0, unitWidth, totalUnits, isRtl);

  return (
    <div
      className="pointer-events-none absolute top-0 z-10"
      style={{
        left: x,
        width: 2,
        height: totalHeight,
        backgroundColor: '#ef4444',
      }}
    >
      <div
        className="today-dot absolute -left-1.5 -top-1 h-3 w-3 rounded-full"
        style={{ backgroundColor: '#ef4444' }}
      />
    </div>
  );
}
