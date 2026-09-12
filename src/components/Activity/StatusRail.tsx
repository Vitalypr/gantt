import type { ActivityStatus } from '@/types/gantt';
import {
  STATUS_RAIL_BOTTOM,
  STATUS_RAIL_HEIGHT,
  STATUS_RAIL_INSET,
} from '@/constants/timeline';
import { statusFillFraction } from '@/utils/activity';
import { railInk } from '@/utils/color';

type StatusRailProps = {
  status: ActivityStatus;
  /** The bar's fill, which decides whether the rail draws in light or dark ink. */
  barColor: string;
  isRtl: boolean;
  /** Override the horizontal inset — a milestone's frame is thicker than a bar's. */
  inset?: number;
};

/**
 * The delivery state of an activity, as a track inside the bar's bottom edge.
 *
 * Absolutely positioned, so it costs the label no height of its own; the bar reserves
 * `STATUS_RAIL_RESERVE` instead. Shared by `ActivityBar` and `MilestoneMarker` — the two
 * components are separately written, and an indicator added to only one of them is an
 * indicator half the chart cannot show.
 */
export function StatusRail({ status, barColor, isRtl, inset = STATUS_RAIL_INSET }: StatusRailProps) {
  const ink = railInk(barColor);
  const fraction = statusFillFraction(status);

  return (
    <div
      data-status-rail
      data-status={status}
      aria-hidden
      className="pointer-events-none absolute overflow-hidden rounded-full"
      style={{
        left: inset,
        right: inset,
        bottom: STATUS_RAIL_BOTTOM,
        height: STATUS_RAIL_HEIGHT,
        backgroundColor: ink.track,
        // Above the fill, below the label — the label is the thing that must stay readable.
        zIndex: 1,
      }}
    >
      {fraction > 0 && (
        <div
          className="absolute inset-y-0 rounded-full"
          style={{
            width: `${fraction * 100}%`,
            // The rail fills from the TEMPORAL start, which is physically right in RTL —
            // the same mirroring the bars themselves do arithmetically.
            ...(isRtl ? { right: 0 } : { left: 0 }),
            backgroundColor: ink.fill,
          }}
        />
      )}
    </div>
  );
}
