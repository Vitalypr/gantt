import { useState } from 'react';
import { ROW_SIZE_MAP } from '@/constants/timeline';
import { useStore } from '@/stores';
import type { TopicCell } from '@/utils/topics';
import { cn } from '@/lib/utils';
import { useDragTopicSpan } from '@/hooks/useDragTopicSpan';

type Row = { rowId: string; y: number };

type TopicColumnProps = {
  rows: Row[];
  cells: TopicCell[];
  width: number;
  totalHeight: number;
};

/**
 * The sideways topic spine.
 *
 * One cell per topic, spanning the rows it covers. Cells are positioned from the SAME row
 * layout the canvas uses, so a cell's extent is the rows' real extent — including any topic
 * gap that fell inside it — rather than `span * rowHeight`, which would drift the moment a
 * gap or a collapsed group changed the pitch.
 */
export function TopicColumn({ rows, cells, width, totalHeight }: TopicColumnProps) {
  const rowSize = useStore((s) => s.rowSize);
  const rowHeight = ROW_SIZE_MAP[rowSize];
  const setRowTopic = useStore((s) => s.setRowTopic);
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const drag = useDragTopicSpan(rows);

  const indexOf = new Map(rows.map((r, i) => [r.rowId, i]));
  // Rows no cell covers. The column is only ever visible because the user asked for it, so an
  // uncovered row gets an empty slot to name rather than a blank strip that does nothing.
  const covered = new Set<string>();
  for (const cell of cells) {
    const first = indexOf.get(cell.leaderRowId);
    if (first === undefined) continue;
    for (let k = 0; k < cell.span; k++) covered.add(rows[first + k]?.rowId ?? '');
  }

  return (
    <div className="relative bg-muted/20" style={{ width, height: totalHeight }}>
      {cells.map((cell) => {
        const first = indexOf.get(cell.leaderRowId);
        if (first === undefined) return null;
        const lastRow = rows[Math.min(first + cell.span - 1, rows.length - 1)];
        const top = rows[first]!.y;
        const height = (lastRow ? lastRow.y + rowHeight : top + rowHeight) - top;
        const isEditing = editingRowId === cell.leaderRowId;

        return (
          <div
            key={cell.leaderRowId}
            data-topic-cell
            data-row-id={cell.leaderRowId}
            className={cn(
              'absolute inset-x-0 flex items-center justify-center overflow-hidden',
              'border-y border-border-subtle bg-muted/50 text-[10px] font-bold tracking-wide',
              'text-muted-foreground',
            )}
            style={{ top, height }}
            onDoubleClick={() => setEditingRowId(cell.leaderRowId)}
            title={cell.label}
          >
            {/* Grab edge: drag it to add rows to this topic or give them back. Same gesture
                as a bar's row-span handle, which is the one this column borrows. */}
            <div
              className="absolute inset-x-0 bottom-0 z-10 h-2 cursor-ns-resize opacity-0 transition-opacity hover:opacity-100"
              style={{ touchAction: 'none' }}
              onPointerDown={(e) => drag.onPointerDown(e, cell.leaderRowId)}
              title="Drag to add or remove rows"
            >
              <div className="absolute inset-x-1 bottom-[2px] h-[2px] rounded-full bg-ring" />
            </div>

            {isEditing ? (
              <TopicInput
                value={cell.label}
                onCommit={(next) => {
                  setRowTopic(cell.leaderRowId, next);
                  setEditingRowId(null);
                }}
                onCancel={() => setEditingRowId(null)}
              />
            ) : (
              <span
                dir="auto"
                className="whitespace-nowrap px-1"
                style={{
                  // Bottom-to-top: the convention on printed engineering charts, and the way
                  // a rotated spreadsheet header reads. `vertical-rl` alone runs top-to-bottom.
                  writingMode: 'vertical-rl',
                  transform: 'rotate(180deg)',
                }}
              >
                {cell.label}
              </span>
            )}
          </div>
        );
      })}

      {drag.preview && rows[drag.preview.startIndex] && (
        <div
          className="pointer-events-none absolute inset-x-0 z-10 rounded-sm border-2 border-ring bg-ring/15"
          style={{
            top: rows[drag.preview.startIndex]!.y,
            height:
              (rows[Math.min(drag.preview.startIndex + drag.preview.span - 1, rows.length - 1)]?.y ??
                0) + rowHeight - rows[drag.preview.startIndex]!.y,
          }}
        />
      )}

      {rows.filter((r) => !covered.has(r.rowId)).map((r) => (
        <div
          key={`empty-${r.rowId}`}
          data-topic-slot
          data-row-id={r.rowId}
          className={cn(
            'absolute inset-x-0 flex cursor-text items-center justify-center',
            'border-y border-dashed border-border-subtle text-[11px] leading-none',
            // Visible at rest, not on hover. An empty slot that only appears under the cursor
            // makes a switched-on column look like an empty strip with nothing in it.
            'text-muted-foreground/70 transition-colors hover:bg-muted/40 hover:text-foreground',
          )}
          style={{ top: r.y, height: rowHeight, touchAction: 'none' }}
          onPointerDown={(e) => drag.onPointerDown(e, r.rowId)}
          onDoubleClick={() => {
            setRowTopic(r.rowId, 'Topic');
            setEditingRowId(r.rowId);
          }}
          title="Drag to cover several rows, or double-click to name one"
        >
          +
        </div>
      ))}
    </div>
  );
}

/**
 * Editor for a topic label. Horizontal while typing: rotated text with a caret in it is
 * unusable, and the cell is only a few characters wide.
 */
function TopicInput({
  value,
  onCommit,
  onCancel,
}: {
  value: string;
  onCommit: (next: string) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState(value);

  return (
    <input
      autoFocus
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => onCommit(draft)}
      onKeyDown={(e) => {
        // stopPropagation FIRST, then preventDefault on the keys we consume — the same order
        // `ActivityNameInput` uses, and the order that actually keeps Enter from being eaten.
        e.stopPropagation();
        if (e.key === 'Enter') {
          e.preventDefault();
          onCommit(draft);
        } else if (e.key === 'Escape') {
          e.preventDefault();
          onCancel();
        }
      }}
      className="w-full bg-background px-1 text-center text-[10px] outline-none"
      style={{ writingMode: 'horizontal-tb' }}
    />
  );
}
