import { getCurrentMonthIndex } from '@/utils/timeline';

type TodayMarkerProps = {
  startYear: number;
  chartStartMonth?: number;
  monthWidth: number;
  totalHeight: number;
};

export function TodayMarker({ startYear, chartStartMonth = 1, monthWidth, totalHeight }: TodayMarkerProps) {
  const todayIndex = getCurrentMonthIndex(startYear, chartStartMonth);

  if (todayIndex < 0) return null;

  // Calculate proportional position within the current month
  const now = new Date();
  const dayOfMonth = now.getDate();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const fractionOfMonth = (dayOfMonth - 1) / daysInMonth;

  const x = todayIndex * monthWidth + fractionOfMonth * monthWidth;

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
