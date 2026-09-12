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
 * Each band is labelled with the holiday's Hebrew name, set sideways at the top of the band.
 * The label reads top-to-bottom because it is anchored at the top — the first letter should be
 * where the eye starts. It is deliberately allowed to overhang: a one-day holiday is a seventh
 * of a week column, about 5.7px at the default zoom, so an 8px label cannot fit inside it. The
 * text sits on its own dark backing strip. White on the band alone measures about 1.5:1 in the
 * LIGHT theme — the band is a 50%-alpha red over a near-white canvas, so it composites to a
 * pale pink — and a text-shadow was not enough at 8px. The strip fixes the contrast in both
 * themes without changing the band colour or the white the label was asked for.
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
        >
          <span
            data-holiday-label
            dir="rtl"
            className="absolute left-1/2 top-1 whitespace-nowrap rounded-sm px-[1px] py-1 text-[8px] font-semibold leading-none"
            style={{
              // Flipped 180° from the default `vertical-rl`, so the glyphs face the other way.
              // `top` anchoring plus the flip is what keeps the label at the head of the band.
              writingMode: 'vertical-rl',
              transform: 'translateX(-50%) rotate(180deg)',
              transformOrigin: 'center',
              color: '#ffffff',
              backgroundColor: 'rgba(15, 23, 42, 0.6)',
              // A long name on a short chart would otherwise run past the last row.
              maxHeight: Math.max(0, totalHeight - 8),
              overflow: 'hidden',
            }}
          >
            {b.nameHe}
          </span>
        </div>
      ))}
    </div>
  );
}
