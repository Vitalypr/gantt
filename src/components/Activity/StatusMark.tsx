import type { ActivityStatus } from '@/types/gantt';
import {
  STATUS_HATCH_ANGLE,
  STATUS_HATCH_PITCH,
  STATUS_HATCH_STROKE,
  STATUS_RAIL_BOTTOM,
  STATUS_RAIL_HEIGHT,
  STATUS_RAIL_INSET,
  STATUS_RAIL_INSET_MAX_SHARE,
  STATUS_RAIL_INSET_MIN,
} from '@/constants/timeline';
import { statusFillFraction } from '@/utils/activity';
import { railInk } from '@/utils/color';

type StatusMarkProps = {
  status: ActivityStatus;
  /** The bar's fill, which decides whether the mark draws in the light or the dark grey. */
  barColor: string;
  isRtl: boolean;
};

/**
 * How an activity's delivery state is drawn: a hatch over the whole bar for "not relevant",
 * a rail inside the bottom edge for everything else.
 *
 * One component for both, and shared by `ActivityBar` and `MilestoneMarker`. Those two are
 * separately written, so a mark added to only one of them is a mark half the chart cannot
 * show — which is how progress came to be invisible on milestones.
 */
export function StatusMark({ status, barColor, isRtl }: StatusMarkProps) {
  const ink = railInk(barColor);
  const fraction = statusFillFraction(status);

  if (fraction === null) {
    return (
      <div
        data-status-mark
        data-status={status}
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-md"
        style={{
          // Under the label: the name has to stay readable straight through it.
          zIndex: 1,
          backgroundImage:
            `repeating-linear-gradient(${STATUS_HATCH_ANGLE}deg, ${ink.hatch} 0 ` +
            `${STATUS_HATCH_STROKE}px, transparent ${STATUS_HATCH_STROKE}px ${STATUS_HATCH_PITCH}px)`,
        }}
      />
    );
  }

  // The inset is capped as a share of the bar so a short bar loses inset rather than losing
  // the rail, and floored so it always clears a milestone's heavier frame.
  const inset =
    `max(${STATUS_RAIL_INSET_MIN}px, min(${STATUS_RAIL_INSET}px, ${STATUS_RAIL_INSET_MAX_SHARE}))`;

  return (
    <div
      data-status-mark
      data-status={status}
      aria-hidden
      className="pointer-events-none absolute overflow-hidden rounded-full"
      style={{
        left: inset,
        right: inset,
        bottom: STATUS_RAIL_BOTTOM,
        height: STATUS_RAIL_HEIGHT,
        backgroundColor: ink.track,
        zIndex: 1,
      }}
    >
      {fraction > 0 && (
        <div
          className="absolute inset-y-0 rounded-full"
          style={{
            width: `${fraction * 100}%`,
            // The rail fills from the TEMPORAL start, which is physically right in RTL — the
            // same mirroring the bars themselves do arithmetically.
            ...(isRtl ? { right: 0 } : { left: 0 }),
            backgroundColor: ink.fill,
          }}
        />
      )}
    </div>
  );
}
