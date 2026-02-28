import { getCurrentMonthIndex, getCurrentWeekIndex } from '@/utils/timeline';
import type { TimelineMode } from '@/types/gantt';

type TodayMarkerProps = {
  startYear: number;
  chartStartMonth?: number;
  unitWidth: number;
  totalHeight: number;
  timelineMode: TimelineMode;
};

export function TodayMarker({ startYear, chartStartMonth = 1, unitWidth, totalHeight, timelineMode }: TodayMarkerProps) {
  let x: number;

  if (timelineMode === 'weeks') {
    const weekIndex = getCurrentWeekIndex(startYear, chartStartMonth);
    if (weekIndex < 0) return null;
    x = weekIndex * unitWidth;
  } else {
    const todayIndex = getCurrentMonthIndex(startYear, chartStartMonth);
    if (todayIndex < 0) return null;
    // Calculate proportional position within the current month
    const now = new Date();
    const dayOfMonth = now.getDate();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const fractionOfMonth = (dayOfMonth - 1) / daysInMonth;
    x = todayIndex * unitWidth + fractionOfMonth * unitWidth;
  }

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
