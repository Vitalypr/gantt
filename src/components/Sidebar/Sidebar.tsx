import { useState, useRef, useEffect } from 'react';
import { Pencil, Trash2, Plus, Merge, SplitSquareVertical, ArrowUp, ArrowDown } from 'lucide-react';
import { ROW_HEIGHT } from '@/constants/timeline';
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
  onResizeMouseDown: (e: React.MouseEvent) => void;
};

export function Sidebar({ rows, sidebarWidth, onResizeMouseDown }: SidebarProps) {
  const chartRows = useStore((s) => s.chart.rows);
  const addRow = useStore((s) => s.addRow);
  const renameRow = useStore((s) => s.renameRow);
  const removeRow = useStore((s) => s.removeRow);
  const toggleRowMerge = useStore((s) => s.toggleRowMerge);
  const moveRow = useStore((s) => s.moveRow);
  const selectedActivity = useStore((s) => s.selectedActivity);

  const [editingRowId, setEditingRowId] = useState<string | null>(null);

  const totalHeight = rows.length > 0 ? rows[rows.length - 1]!.y + ROW_HEIGHT : 0;

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
                  height: ROW_HEIGHT,
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

      {/* Resize handle */}
      <div
        className="absolute right-0 top-0 z-20 h-full w-1 cursor-col-resize hover:bg-ring/30"
        onMouseDown={onResizeMouseDown}
      />
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
}: {
  name: string;
  isEditing: boolean;
  onStartEdit: () => void;
  onCommit: (name: string) => void;
  onCancel: () => void;
  mergeSpan: number;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState(name);

  useEffect(() => {
    if (isEditing) {
      setValue(name);
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 0);
    }
  }, [isEditing, name]);

  const spanHeight = ROW_HEIGHT * mergeSpan;

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

  return (
    <span
      className={cn(
        'truncate flex-1 cursor-text text-[13px] font-semibold text-muted-foreground/80 hover:text-foreground transition-colors',
        mergeSpan > 1 && 'absolute left-3 right-3 flex items-center',
      )}
      onDoubleClick={onStartEdit}
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
