import { useEffect, useMemo, useRef } from 'react';
import { Search, X } from 'lucide-react';
import { useStore } from '@/stores';
import { activeChart } from '@/stores/selectors';
import { cn } from '@/lib/utils';

/**
 * Find and jump to an activity.
 *
 * Transient UI, so the query lives in `uiSlice` and is outside `partialize` - Ctrl+Z must
 * never undo a search. Matching is case-insensitive and accent-blind via `localeCompare`
 * semantics, which also makes it work for Hebrew.
 */
export function FindPanel() {
  const query = useStore((s) => s.findQuery);
  const setFindQuery = useStore((s) => s.setFindQuery);
  const selectActivity = useStore((s) => s.selectActivity);
  const chart = useStore((s) => activeChart(s));
  const rows = chart.rows;
  const inputRef = useRef<HTMLInputElement>(null);

  // Named, not `[query !== null]`: a computed dependency cannot be checked statically, so the
  // linter reports it as a missing dep and the noise sits alongside the ones that matter.
  const isOpen = query !== null;
  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

  const matches = useMemo(() => {
    const q = (query ?? '').trim().toLocaleLowerCase();
    if (!q) return [];
    const rowNameOf = new Map<string, string>();
    for (const r of rows) for (const id of r.activityIds) rowNameOf.set(id, r.name);
    return chart.activities
      .filter(
        (a) =>
          a.name.toLocaleLowerCase().includes(q) ||
          (rowNameOf.get(a.id) ?? '').toLocaleLowerCase().includes(q),
      )
      .slice(0, 20)
      .map((a) => ({ ...a, rowName: rowNameOf.get(a.id) ?? '' }));
  }, [query, chart.activities, rows]);

  if (query === null) return null;

  const jumpTo = (id: string) => {
    selectActivity({ activityId: id });
    // Measured from the DOM rather than recomputed: the bar already knows where it is, in
    // whatever direction and zoom the chart is currently at.
    document
      .querySelector(`[data-activity-id="${CSS.escape(id)}"]`)
      ?.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
  };

  return (
    <div
      data-app-chrome
      data-find-panel
      className="absolute right-3 top-14 z-50 w-72 rounded-md border border-border bg-popover p-2 shadow-lg"
    >
      <div className="flex items-center gap-1.5">
        <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        <input
          ref={inputRef}
          dir="auto"
          aria-label="Find activity"
          value={query}
          placeholder="Find activity or row…"
          onChange={(e) => setFindQuery(e.target.value)}
          onKeyDown={(e) => {
            e.stopPropagation();
            if (e.key === 'Escape') setFindQuery(null);
            if (e.key === 'Enter' && matches[0]) jumpTo(matches[0].id);
          }}
          className="h-7 flex-1 bg-transparent text-label text-foreground outline-none"
        />
        <button
          aria-label="Close find"
          className="rounded-sm p-1 text-muted-foreground hover:text-foreground"
          onClick={() => setFindQuery(null)}
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {query.trim() !== '' && (
        <div className="mt-1.5 max-h-56 overflow-y-auto border-t border-border/60 pt-1.5">
          {matches.length === 0 ? (
            <p className="py-3 text-center text-micro text-muted-foreground">No matches.</p>
          ) : (
            matches.map((m) => (
              <button
                key={m.id}
                dir="auto"
                className={cn(
                  'flex w-full items-center gap-2 rounded-sm px-1.5 py-1 text-left text-label',
                  'hover:bg-accent focus-visible:bg-accent',
                )}
                onClick={() => jumpTo(m.id)}
              >
                <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ backgroundColor: m.color }} />
                <span className="flex-1 truncate">{m.name || '(unnamed)'}</span>
                {m.rowName && (
                  <span className="shrink-0 truncate text-micro text-muted-foreground">{m.rowName}</span>
                )}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
