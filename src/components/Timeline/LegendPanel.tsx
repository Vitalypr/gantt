import { useMemo, useState } from 'react';
import { useStore } from '@/stores';
import { activeChart } from '@/stores/selectors';

/**
 * In-chart legend: colour -> meaning.
 *
 * Entries are DERIVED from the colours actually in use rather than maintained as a separate
 * list, so a legend can never name a colour that is no longer on the chart or miss one that
 * is. Rendered inside `[data-gantt-grid]`, which is the snapshot capture root, so it ships in
 * the exported image and the PDF for free.
 *
 * Editing is inline and only while focused, so what the export captures is plain text rather
 * than a row of input boxes.
 */
export function LegendPanel() {
  const showLegend = useStore((s) => s.showLegend);
  const chart = useStore((s) => activeChart(s));
  const setLegendLabel = useStore((s) => s.setLegendLabel);
  const [editingColor, setEditingColor] = useState<string | null>(null);

  const entries = useMemo(() => {
    const labelOf = new Map((chart.legend ?? []).map((e) => [e.color, e.label]));
    // Order of first appearance, so the legend reads in the order the chart does.
    const seen: string[] = [];
    for (const a of chart.activities) if (!seen.includes(a.color)) seen.push(a.color);
    return seen.map((color) => ({ color, label: labelOf.get(color) ?? '' }));
  }, [chart.activities, chart.legend]);

  if (!showLegend || entries.length === 0) return null;

  return (
    <div
      data-chart-legend
      className="absolute bottom-2 left-2 z-40 rounded-md border border-border bg-surface/95 px-2 py-1.5 shadow-sm"
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1" style={{ maxWidth: 520 }}>
        {entries.map(({ color, label }) => (
          <span key={color} className="flex items-center gap-1.5">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-sm"
              style={{ backgroundColor: color, outline: '1px solid var(--color-bar-outline)' }}
            />
            {editingColor === color ? (
              <input
                autoFocus
                dir="auto"
                aria-label={`Meaning of ${color}`}
                defaultValue={label}
                className="w-28 bg-transparent text-micro text-foreground outline-none"
                onBlur={(e) => {
                  setLegendLabel(color, e.target.value);
                  setEditingColor(null);
                }}
                onKeyDown={(e) => {
                  e.stopPropagation();
                  if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                  if (e.key === 'Escape') setEditingColor(null);
                }}
              />
            ) : (
              <button
                dir="auto"
                className="text-micro text-foreground/80 hover:text-foreground"
                onClick={() => setEditingColor(color)}
              >
                {label || <span className="italic opacity-50">name this colour</span>}
              </button>
            )}
          </span>
        ))}
      </div>
    </div>
  );
}
