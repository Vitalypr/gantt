import { useStore } from '@/stores';
import type { TimelineMode } from '@/types/gantt';
import { dateToUnitOffset, unitSpanToLeft } from '@/utils/timeline';
import { useChartDirection } from '@/hooks/useChartDirection';
import { activeChart } from '@/stores/selectors';

type MarkerLayerProps = {
  startYear: number;
  startMonth: number;
  unitWidth: number;
  totalUnits: number;
  totalHeight: number;
  timelineMode: TimelineMode;
};

const DEFAULT_MARKER_COLOR = 'var(--color-primary)';

/**
 * Named vertical lines - deadlines, gates, reviews.
 *
 * Positioned from a real calendar date through the same `dateToUnitOffset` -> `unitSpanToLeft`
 * pipeline as the today marker and the holiday bands, so all three agree in both timeline
 * modes and both directions. Inside `[data-gantt-grid]`, so markers ship in the export.
 */
export function MarkerLayer({
  startYear,
  startMonth,
  unitWidth,
  totalUnits,
  totalHeight,
  timelineMode,
}: MarkerLayerProps) {
  const { isRtl } = useChartDirection();
  const markers = useStore((s) => activeChart(s).markers);

  if (!markers || markers.length === 0) return null;

  return (
    <div className="pointer-events-none absolute inset-0" style={{ height: totalHeight }}>
      {markers.map((marker) => {
        const parts = marker.date.split('-').map(Number);
        const [y, m, d] = parts;
        if (!y || !m || !d) return null;
        const offset = dateToUnitOffset(new Date(y, m - 1, d), startYear, startMonth, timelineMode);
        // Outside the chart's range: drawing it would pin it to an edge and lie about when
        // the deadline is.
        if (offset < 0 || offset > totalUnits) return null;

        const x = unitSpanToLeft(offset, 0, unitWidth, totalUnits, isRtl);
        const color = marker.color ?? DEFAULT_MARKER_COLOR;

        return (
          <div
            key={marker.id}
            data-chart-marker
            className="pointer-events-none absolute top-0"
            style={{ left: x, height: totalHeight }}
          >
            <div style={{ width: 2, height: '100%', backgroundColor: color, opacity: 0.85 }} />
            <span
              dir="auto"
              data-user-text
              className="absolute top-0 whitespace-nowrap rounded-sm px-1 text-micro font-semibold"
              style={{
                // Label hangs on the side the chart reads from, so it never sits off-canvas.
                [isRtl ? 'right' : 'left']: 4,
                backgroundColor: color,
                color: 'var(--color-primary-foreground)',
              }}
            >
              {marker.name}
            </span>
          </div>
        );
      })}
    </div>
  );
}
