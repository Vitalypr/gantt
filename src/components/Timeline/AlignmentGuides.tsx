import { unitSpanToLeft } from '@/utils/timeline';
import { useChartDirection } from '@/hooks/useChartDirection';

type AlignmentGuidesProps = {
  units: number[];
  unitWidth: number;
  totalUnits: number;
  totalHeight: number;
};

/**
 * Vertical guides shown while a bar is dragged into line with another bar's edge.
 *
 * This is the design-tool answer to what scheduling products solve with typed dependencies:
 * the chart already snaps to whole units, so bars DO align - there was simply no feedback
 * saying that they had, which made deliberate alignment guesswork.
 */
export function AlignmentGuides({ units, unitWidth, totalUnits, totalHeight }: AlignmentGuidesProps) {
  const { isRtl } = useChartDirection();
  if (units.length === 0) return null;

  return (
    <div className="pointer-events-none absolute inset-0" style={{ height: totalHeight }}>
      {units.map((unit) => (
        <div
          key={unit}
          data-alignment-guide
          className="absolute top-0"
          style={{
            left: unitSpanToLeft(unit, 0, unitWidth, totalUnits, isRtl),
            width: 1,
            height: totalHeight,
            backgroundColor: 'var(--color-ring)',
            opacity: 0.9,
          }}
        />
      ))}
    </div>
  );
}
