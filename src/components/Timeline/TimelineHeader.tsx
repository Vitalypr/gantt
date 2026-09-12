import { useMemo } from 'react';
import {
  buildYearHeaders,
  buildQuarterHeaders,
  buildMonthHeaders,
  buildMonthHeadersForWeeks,
  buildWeekHeaders,
  buildYearHeadersForWeeks,
} from '@/utils/timeline';
import type { TimelineMode } from '@/types/gantt';
import { TIER_HEIGHT, getHeaderHeight } from '@/utils/layout';
import { monthLabel, monthLong, quarterLabel, quarterLabelForWidth, weekLabel, weekLabelForWidth } from '@/utils/i18n';
import { useChartDirection } from '@/hooks/useChartDirection';

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

/**
 * Three tiers that must differ in weight, not just content: when all three were the same
 * size an 84px band read as one undifferentiated block.
 *
 * Mirroring is `flex-direction: row-reverse`, never `direction: rtl`. `direction` inherits
 * into the timeline body and inverts the scroll origin; row-reverse is a purely physical
 * change, and it places unit 0 at exactly the x that `unitSpanToLeft` computes for it, so the
 * header columns and the absolutely-positioned bars stay aligned.
 */
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
  const { isRtl, locale } = useChartDirection();
  const flow = isRtl ? ('row-reverse' as const) : ('row' as const);

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
  const weekMonthHeaders = useMemo(
    () => buildMonthHeadersForWeeks(startYear, endYear, chartStartMonth, chartEndMonth),
    [startYear, endYear, chartStartMonth, chartEndMonth],
  );
  const weekYearHeaders = useMemo(
    () => buildYearHeadersForWeeks(startYear, endYear, chartStartMonth, chartEndMonth),
    [startYear, endYear, chartStartMonth, chartEndMonth],
  );
  const weekHeaders = useMemo(
    () => buildWeekHeaders(startYear, endYear, chartStartMonth, chartEndMonth),
    [startYear, endYear, chartStartMonth, chartEndMonth],
  );

  // Tier styling. Year is the anchor and reads heaviest; the unit row is the lightest.
  const yearCell =
    'flex items-center justify-center border-b border-r text-body font-bold tracking-tight text-foreground overflow-hidden';
  const middleCell =
    'flex items-center justify-center border-b border-r text-meta font-medium text-foreground/70 overflow-hidden';
  const unitCell =
    'flex items-center justify-center border-r text-micro text-muted-foreground overflow-hidden';

  if (timelineMode === 'weeks') {
    return (
      <div
        data-timeline-header
        className="relative border-b bg-background"
        style={{ width: totalWidth, height: getHeaderHeight('weeks', showQuarters) }}
      >
        <div className="flex" style={{ height: TIER_HEIGHT, flexDirection: flow }}>
          {weekYearHeaders.map((y) => (
            <div
              key={`wy-${y.year}`}
              className={yearCell}
              style={{ width: y.spanWeeks * unitWidth, height: TIER_HEIGHT }}
            >
              {y.year}
            </div>
          ))}
        </div>

        <div className="flex" style={{ height: TIER_HEIGHT, flexDirection: flow }}>
          {weekMonthHeaders.map((mh) => {
            const w = mh.spanWeeks * unitWidth;
            return (
              <div
                key={`wm-${mh.year}-${mh.month}`}
                className={middleCell}
                style={{ width: w, height: TIER_HEIGHT }}
                title={monthLong(locale, mh.month)}
              >
                {monthLabel(locale, mh.month, w)}
              </div>
            );
          })}
        </div>

        <div className="flex" style={{ height: TIER_HEIGHT, flexDirection: flow }}>
          {weekHeaders.map((wh) => (
            <div
              key={wh.weekIndex}
              className={unitCell}
              style={{ width: unitWidth, height: TIER_HEIGHT }}
              title={weekLabel(locale, wh.weekNumber)}
            >
              {weekLabelForWidth(locale, wh.weekNumber, unitWidth)}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      data-timeline-header
      className="relative border-b bg-background"
      style={{ width: totalWidth, height: getHeaderHeight('months', showQuarters) }}
    >
      <div className="flex" style={{ height: TIER_HEIGHT, flexDirection: flow }}>
        {years.map((y) => (
          <div
            key={`y-${y.year}`}
            className={yearCell}
            style={{ width: y.spanMonths * unitWidth, height: TIER_HEIGHT }}
          >
            {y.year}
          </div>
        ))}
      </div>

      {showQuarters && (
        <div className="flex" style={{ height: TIER_HEIGHT, flexDirection: flow }}>
          {quarters.map((q, i) => {
            const w = q.spanMonths * unitWidth;
            return (
              <div
                key={`q-${i}`}
                className={middleCell}
                style={{ width: w, height: TIER_HEIGHT }}
                title={quarterLabel(locale, q.quarter, q.year)}
              >
                {quarterLabelForWidth(locale, q.quarter, q.year, w)}
              </div>
            );
          })}
        </div>
      )}

      <div className="flex" style={{ height: TIER_HEIGHT, flexDirection: flow }}>
        {months.map((m) => (
          <div
            key={m.monthIndex}
            className={unitCell}
            style={{ width: unitWidth, height: TIER_HEIGHT }}
            title={monthLong(locale, m.monthNumber)}
          >
            {monthLabel(locale, m.monthNumber, unitWidth)}
          </div>
        ))}
      </div>
    </div>
  );
}
