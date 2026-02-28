import { useState, useRef, useEffect } from 'react';
import { Pencil, Trash2, Plus, Merge, SplitSquareVertical, ArrowUp, ArrowDown } from 'lucide-react';
import { ROW_SIZE_MAP } from '@/constants/timeline';
import { useStore } from '@/stores';
import { cn } from '@/lib/utils';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  ContextMenuSeparator,
} from '@/components/ui/context-menu';

type Row = {
  rowId: string;
  activityIds: string[];
  y: number;
  mergedWithNext?: boolean;
};

type SidebarProps = {
  rows: Row[];
  sidebarWidth: number;
  onResizePointerDown: (e: React.PointerEvent) => void;
};

export function Sidebar({ rows, sidebarWidth, onResizePointerDown }: SidebarProps) {
  const rowSize = useStore((s) => s.rowSize);
  const rowHeight = ROW_SIZE_MAP[rowSize];
  const chartRows = useStore((s) => s.timelineMode === 'weeks' ? s.weeksChart.rows : s.chart.rows);
  const addRow = useStore((s) => s.addRow);
  const renameRow = useStore((s) => s.renameRow);
  const removeRow = useStore((s) => s.removeRow);
  const toggleRowMerge = useStore((s) => s.toggleRowMerge);
  const moveRow = useStore((s) => s.moveRow);
  const selectedActivity = useStore((s) => s.selectedActivity);

  const [editingRowId, setEditingRowId] = useState<string | null>(null);

  const totalHeight = rows.length > 0 ? rows[rows.length - 1]!.y + rowHeight : 0;

  // Build merge groups
  const mergeGroups = buildMergeGroups(rows);

  return (
    <div className="relative" style={{ width: sidebarWidth, height: totalHeight }}>
      {rows.map((row, index) => {
        const rowData = chartRows.find((r) => r.id === row.rowId);
        const mergeGroup = mergeGroups.get(row.rowId);
        const isMergeLeader = mergeGroup !== undefined && mergeGroup.leaderId === row.rowId;
        const isMergeFollower = mergeGroup !== undefined && mergeGroup.leaderId !== row.rowId;

        const nextRow = rows[index + 1];
        const canMergeDown = nextRow !== undefined;

        const isSelected = row.activityIds.some(
          (aid) => selectedActivity?.activityId === aid,
        );

        return (
          <ContextMenu key={`sr-${row.rowId}`}>
            <ContextMenuTrigger asChild>
              <div
                data-sidebar-row
                className={cn(
                  'absolute flex items-center px-3 text-xs',
                  isSelected && 'bg-accent/50 text-foreground',
                  // Hide bottom border for merged leader rows (except the last in group)
                  isMergeLeader && 'border-b-0',
                  // Hide bottom border for merged followers (except the last in the group)
                  isMergeFollower && row.mergedWithNext && 'border-b-0',
                  // Only show bottom border for non-merged rows or the last row of a merge group
                  !isMergeLeader && !isMergeFollower && 'border-b border-border-subtle',
                  isMergeFollower && !row.mergedWithNext && 'border-b border-border-subtle',
                )}
                style={{
                  top: row.y,
                  height: rowHeight,
                  width: '100%',
                }}
              >
                {/* Row name - show for leader or non-merged rows */}
                {!isMergeFollower && (
                  <SidebarRowName
                    name={rowData?.name ?? ''}
                    isEditing={editingRowId === row.rowId}
                    onStartEdit={() => setEditingRowId(row.rowId)}
                    onCommit={(name) => {
                      renameRow(row.rowId, name);
                      setEditingRowId(null);
                    }}
                    onCancel={() => setEditingRowId(null)}
                    mergeSpan={isMergeLeader ? mergeGroup.count : 1}
                    rowHeight={rowHeight}
                  />
                )}
              </div>
            </ContextMenuTrigger>
            <ContextMenuContent>
              <ContextMenuItem onClick={() => setEditingRowId(row.rowId)}>
                <Pencil className="mr-2 h-3.5 w-3.5" />
                Rename Row
              </ContextMenuItem>
              <ContextMenuItem onClick={() => addRow(undefined, row.rowId)}>
                <Plus className="mr-2 h-3.5 w-3.5" />
                Add Row Below
              </ContextMenuItem>
              {index > 0 && (
                <ContextMenuItem onClick={() => moveRow(row.rowId, 'up')}>
                  <ArrowUp className="mr-2 h-3.5 w-3.5" />
                  Move Up
                </ContextMenuItem>
              )}
              {index < rows.length - 1 && (
                <ContextMenuItem onClick={() => moveRow(row.rowId, 'down')}>
                  <ArrowDown className="mr-2 h-3.5 w-3.5" />
                  Move Down
                </ContextMenuItem>
              )}
              {canMergeDown && (
                <ContextMenuItem onClick={() => toggleRowMerge(row.rowId)}>
                  {row.mergedWithNext ? (
                    <>
                      <SplitSquareVertical className="mr-2 h-3.5 w-3.5" />
                      Unmerge
                    </>
                  ) : (
                    <>
                      <Merge className="mr-2 h-3.5 w-3.5" />
                      Merge with Below
                    </>
                  )}
                </ContextMenuItem>
              )}
              <ContextMenuSeparator />
              <ContextMenuItem
                className="text-destructive"
                onClick={() => removeRow(row.rowId)}
              >
                <Trash2 className="mr-2 h-3.5 w-3.5" />
                Delete Row
              </ContextMenuItem>
            </ContextMenuContent>
          </ContextMenu>
        );
      })}

      {/* Resize handle — wide touch target with thin visible line */}
      <div
        className="absolute top-0 z-20 h-full w-5 cursor-col-resize group"
        style={{ touchAction: 'none', right: -10 }}
        onPointerDown={onResizePointerDown}
      >
        <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-border group-hover:bg-ring/50 group-active:bg-ring transition-colors" />
      </div>
    </div>
  );
}

function SidebarRowName({
  name,
  isEditing,
  onStartEdit,
  onCommit,
  onCancel,
  mergeSpan,
  rowHeight,
}: {
  name: string;
  isEditing: boolean;
  onStartEdit: () => void;
  onCommit: (name: string) => void;
  onCancel: () => void;
  mergeSpan: number;
  rowHeight: number;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState(name);
  const lastTapRef = useRef<{ time: number; x: number; y: number }>({ time: 0, x: 0, y: 0 });

  useEffect(() => {
    if (isEditing) {
      setValue(name);
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 0);
    }
  }, [isEditing, name]);

  const spanHeight = rowHeight * mergeSpan;

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={() => onCommit(value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') onCommit(value);
          if (e.key === 'Escape') onCancel();
        }}
        className="w-full bg-transparent text-xs font-medium text-foreground outline-none px-1 -mx-1 border border-ring rounded"
        style={mergeSpan > 1 ? { height: spanHeight - 8, position: 'absolute', top: 4, left: 8, right: 8, width: 'auto' } : undefined}
      />
    );
  }

  const handlePointerDown = (e: React.PointerEvent) => {
    const now = Date.now();
    const last = lastTapRef.current;
    if (now - last.time < 300 && Math.abs(e.clientX - last.x) < 25 && Math.abs(e.clientY - last.y) < 25) {
      lastTapRef.current = { time: 0, x: 0, y: 0 };
      onStartEdit();
      return;
    }
    lastTapRef.current = { time: now, x: e.clientX, y: e.clientY };
  };

  return (
    <span
      className={cn(
        'truncate flex-1 cursor-text text-[13px] font-semibold text-muted-foreground/80 hover:text-foreground transition-colors',
        mergeSpan > 1 && 'absolute left-3 right-3 flex items-center',
      )}
      onDoubleClick={onStartEdit}
      onPointerDown={handlePointerDown}
      style={mergeSpan > 1 ? { height: spanHeight, top: 0 } : undefined}
    >
      {name || <span className="italic opacity-40 text-xs font-normal">Double-click to name</span>}
    </span>
  );
}

function buildMergeGroups(rows: Row[]) {
  const groups = new Map<string, { leaderId: string; count: number }>();
  let i = 0;
  while (i < rows.length) {
    const row = rows[i]!;
    if (row.mergedWithNext) {
      const leaderId = row.rowId;
      let count = 1;
      let j = i + 1;
      while (j < rows.length) {
        const next = rows[j]!;
        count++;
        groups.set(next.rowId, { leaderId, count: 0 });
        if (!next.mergedWithNext) break;
        j++;
      }
      groups.set(leaderId, { leaderId, count });
      // Update followers with leader's count
      for (let k = i + 1; k <= Math.min(j, rows.length - 1); k++) {
        const follower = rows[k]!;
        if (groups.has(follower.rowId)) {
          groups.set(follower.rowId, { leaderId, count });
        }
      }
      i = j + 1;
    } else {
      i++;
    }
  }
  return groups;
}
