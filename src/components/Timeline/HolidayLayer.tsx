import { useMemo } from 'react';
import type { TimelineMode } from '@/types/gantt';
import { getHolidays } from '@/utils/holidays';
import { addDays, dateToUnitOffset, unitSpanToLeft } from '@/utils/timeline';
import { useChartDirection } from '@/hooks/useChartDirection';

type HolidayLayerProps = {
  startYear: number;
  startMonth: number;
  endYear: number;
  endMonth: number;
  unitWidth: number;
  totalUnits: number;
  totalHeight: number;
  timelineMode: TimelineMode;
};

/**
 * Israeli public holidays, shaded down the full height of the canvas.
 *
 * Width is PROPORTIONAL to the holiday's real length: a one-day holiday is a seventh of a
 * week column, a two-day one is two sevenths. Painting every holiday a whole column wide
 * would tell a planner that Yom Kippur costs a week.
 *
 * WEEKS MODE ONLY. At month granularity one day is about a thirtieth of a column - roughly a
 * pixel at normal zoom - so a year of holidays renders as a scatter of red slivers that reads
 * as chart corruption rather than information. A day is legible as a seventh of a week
 * column, which is the granularity this was asked for.
 *
 * Behind the bars and `pointer-events: none`, so it can never swallow a click; and it lives
 * inside `[data-gantt-grid]`, so it ships in the exported image like everything else there.
 */
export function HolidayLayer({
  startYear,
  startMonth,
  endYear,
  endMonth,
  unitWidth,
  totalUnits,
  totalHeight,
  timelineMode,
}: HolidayLayerProps) {
  const { isRtl } = useChartDirection();

  const bands = useMemo(() => {
    if (timelineMode !== 'weeks') return [];
    const rangeStart = new Date(startYear, startMonth - 1, 1);
    const rangeEnd = new Date(endYear, endMonth, 0); // last day of endMonth
    return getHolidays(rangeStart, rangeEnd)
      .map((h) => {
        const from = dateToUnitOffset(h.start, startYear, startMonth, timelineMode);
        // Exclusive end: the day after the last day, which makes the width exactly the
        // holiday's duration rather than one unit short.
        const to = dateToUnitOffset(addDays(h.end, 1), startYear, startMonth, timelineMode);
        const clampedFrom = Math.max(0, Math.min(from, totalUnits));
        const clampedTo = Math.max(0, Math.min(to, totalUnits));
        return { ...h, from: clampedFrom, span: clampedTo - clampedFrom };
      })
      .filter((b) => b.span > 0);
  }, [startYear, startMonth, endYear, endMonth, totalUnits, timelineMode]);

  if (bands.length === 0) return null;

  return (
    <div className="pointer-events-none absolute inset-0" style={{ height: totalHeight }}>
      {bands.map((b) => (
        <div
          key={`${b.name}-${b.start.toISOString()}`}
          data-holiday
          className="bg-holiday pointer-events-none absolute top-0"
          title={`${b.nameHe} · ${b.name}`}
          style={{
            left: unitSpanToLeft(b.from, b.span, unitWidth, totalUnits, isRtl),
            width: b.span * unitWidth,
            height: totalHeight,
          }}
        />
      ))}
    </div>
  );
}
