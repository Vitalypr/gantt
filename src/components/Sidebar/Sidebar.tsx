import { useState, useRef } from 'react';
import { Pencil, Trash2, Plus, Merge, SplitSquareVertical, ArrowUp, ArrowDown, FolderTree, ChevronDown, ChevronRight, Tag, Link2, Unlink } from 'lucide-react';
import { ROW_SIZE_MAP } from '@/constants/timeline';
import { useStore } from '@/stores';
import { useChartDirection } from '@/hooks/useChartDirection';
import { useDoubleTap } from '@/hooks/useDoubleTap';
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
  isGroup?: boolean;
  collapsed?: boolean;
  gapBefore?: boolean;
  gapAfter?: boolean;
};

type SidebarProps = {
  rows: Row[];
  sidebarWidth: number;
  onResizePointerDown: (e: React.PointerEvent) => void;
  /** Nudge the width by `delta` px — the keyboard path for the same control. */
  onResizeStep: (delta: number) => void;
};

export function Sidebar({ rows, sidebarWidth, onResizePointerDown, onResizeStep }: SidebarProps) {
  const { isRtl } = useChartDirection();
  const rowSize = useStore((s) => s.rowSize);
  const rowHeight = ROW_SIZE_MAP[rowSize];
  const chartRows = useStore((s) => s.timelineMode === 'weeks' ? s.weeksChart.rows : s.chart.rows);
  const addRow = useStore((s) => s.addRow);
  const renameRow = useStore((s) => s.renameRow);
  const removeRow = useStore((s) => s.removeRow);
  const toggleRowMerge = useStore((s) => s.toggleRowMerge);
  const setRowTopic = useStore((s) => s.setRowTopic);
  const toggleRowTopicMerge = useStore((s) => s.toggleRowTopicMerge);
  const moveRow = useStore((s) => s.moveRow);
  const toggleRowGroup = useStore((s) => s.toggleRowGroup);
  const toggleRowCollapsed = useStore((s) => s.toggleRowCollapsed);
  const selectedActivityIds = useStore((s) => s.selectedActivityIds);

  const [editingRowId, setEditingRowId] = useState<string | null>(null);

  const totalHeight = rows.length > 0 ? rows[rows.length - 1]!.y + rowHeight : 0;

  // Build merge groups
  const mergeGroups = buildMergeGroups(rows);

  return (
    <div className="relative h-full" style={{ width: sidebarWidth, minHeight: totalHeight }}>
      {rows.map((row, index) => {
        const rowData = chartRows.find((r) => r.id === row.rowId);
        const mergeGroup = mergeGroups.get(row.rowId);
        const isMergeLeader = mergeGroup !== undefined && mergeGroup.leaderId === row.rowId;
        const isMergeFollower = mergeGroup !== undefined && mergeGroup.leaderId !== row.rowId;

        const nextRow = rows[index + 1];
        const canMergeDown = nextRow !== undefined;

        const isSelected = row.activityIds.some((aid) => selectedActivityIds.includes(aid));

        return (
          <ContextMenu key={`sr-${row.rowId}`}>
            <ContextMenuTrigger asChild>
              <div
                data-sidebar-row
                data-row-group={row.isGroup ? '' : undefined}
                className={cn(
                  'absolute flex items-center px-3 text-xs',
                  row.isGroup && 'bg-muted/60 font-bold',
                  // Close the box on whichever side a topic band touches, in the full-strength
                  // border rather than the row hairline — these two edges are what make the
                  // band read as a break rather than as space belonging to a row. Listed after
                  // the merge rules so a merge leader, which drops its bottom border, still
                  // draws one here.
                  row.gapBefore && 'border-t border-border',
                  row.gapAfter && 'border-b border-border',
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
                  // A merge leader's name spans the whole group, but each follower row is a
                  // LATER absolutely-positioned sibling and would paint over the lower part
                  // of that label — swallowing clicks on it. Lift the leader above them.
                  zIndex: isMergeLeader ? 1 : undefined,
                }}
              >
                {row.isGroup && (
                  <button
                    aria-label={row.collapsed ? 'Expand phase' : 'Collapse phase'}
                    aria-expanded={!row.collapsed}
                    className="mr-1 shrink-0 rounded-sm p-0.5 text-muted-foreground hover:text-foreground"
                    onClick={() => toggleRowCollapsed(row.rowId)}
                  >
                    {row.collapsed
                      ? <ChevronRight className="h-3.5 w-3.5" />
                      : <ChevronDown className="h-3.5 w-3.5" />}
                  </button>
                )}

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
              <ContextMenuItem onClick={() => toggleRowGroup(row.rowId)}>
                <FolderTree className="mr-2 h-3.5 w-3.5" />
                {row.isGroup ? 'Not a phase' : 'Make phase header'}
              </ContextMenuItem>
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
              {/* Topic cells merge independently of name cells: a topic spans rows whose
                  names stay separate, which is the whole point of the column. */}
              {/* No prompt(): the app renames everything else inline, and a modal here would be
                  the only blocking dialog in the product. Setting a topic makes the column
                  appear with a placeholder; double-clicking the cell edits it in place. */}
              <ContextMenuItem
                onClick={() => setRowTopic(row.rowId, rowData?.topic ? '' : 'Topic')}
              >
                <Tag className="mr-2 h-3.5 w-3.5" />
                {rowData?.topic ? 'Clear Topic' : 'Set Topic'}
              </ContextMenuItem>
              {canMergeDown && (
                <ContextMenuItem onClick={() => toggleRowTopicMerge(row.rowId)}>
                  {rowData?.topicMergedWithNext ? (
                    <>
                      <Unlink className="mr-2 h-3.5 w-3.5" />
                      Split Topic Below
                    </>
                  ) : (
                    <>
                      <Link2 className="mr-2 h-3.5 w-3.5" />
                      Join Topic with Below
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

      {/* Resize handle — wide touch target on the edge the sidebar SHARES with the timeline,
          which is physically left in RTL; `right` there put it against the window edge.

          It carries a visible grip, not just a hairline. A 1px line indistinguishable from the
          column border is a control nobody finds: this divider has been reported as missing
          three times, and it was there the whole while. */}
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize row names column"
        tabIndex={0}
        className="absolute top-0 z-20 h-full w-5 cursor-col-resize group focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring"
        style={isRtl ? { touchAction: 'none', left: -10 } : { touchAction: 'none', right: -10 }}
        onPointerDown={onResizePointerDown}
        onKeyDown={(e) => {
          // Keyboard path: the drag is pointer-only, and this is the one control whose whole
          // job is a width the user may want to nudge precisely.
          const step = e.shiftKey ? 32 : 8;
          if (e.key === 'ArrowLeft') onResizeStep(isRtl ? step : -step);
          else if (e.key === 'ArrowRight') onResizeStep(isRtl ? -step : step);
          else return;
          e.preventDefault();
        }}
      >
        <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-border transition-colors group-hover:bg-ring/60 group-active:bg-ring" />
        {/* Grip: three dots, centred vertically, always visible but low-contrast until hover. */}
        <div
          className="pointer-events-none absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-[3px] rounded-full bg-background px-[3px] py-1 opacity-70 transition-opacity group-hover:opacity-100"
          aria-hidden
        >
          <span className="block h-[3px] w-[3px] rounded-full bg-muted-foreground group-hover:bg-ring" />
          <span className="block h-[3px] w-[3px] rounded-full bg-muted-foreground group-hover:bg-ring" />
          <span className="block h-[3px] w-[3px] rounded-full bg-muted-foreground group-hover:bg-ring" />
        </div>
      </div>
    </div>
  );
}

/**
 * Row name cell. The editor is a separate component mounted only while editing, so its
 * initial value comes from props rather than an effect that re-seeds state on every
 * `isEditing` flip.
 */
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
  const checkDoubleTap = useDoubleTap();
  const spanHeight = rowHeight * mergeSpan;

  if (isEditing) {
    return (
      <RowNameInput
        initialName={name}
        onCommit={onCommit}
        onCancel={onCancel}
        style={mergeSpan > 1 ? { height: spanHeight - 8, position: 'absolute', top: 4, left: 8, right: 8, width: 'auto' } : undefined}
      />
    );
  }

  return (
    <span
      dir="auto"
      data-user-text
      title={name || undefined}
      className={cn(
        'truncate flex-1 cursor-text text-body font-semibold text-muted-foreground/80 hover:text-foreground transition-colors',
        mergeSpan > 1 && 'absolute left-3 right-3 flex items-center',
      )}
      onDoubleClick={onStartEdit}
      onPointerDown={(e) => {
        // Touch/pen only — a mouse is served by onDoubleClick above.
        if (checkDoubleTap(e, 'row-name')) onStartEdit();
      }}
      style={mergeSpan > 1 ? { height: spanHeight, top: 0 } : undefined}
    >
      {name || <span className="italic opacity-40 text-xs font-normal">Double-click to name</span>}
    </span>
  );
}

function RowNameInput({
  initialName,
  onCommit,
  onCancel,
  style,
}: {
  initialName: string;
  onCommit: (name: string) => void;
  onCancel: () => void;
  style?: React.CSSProperties;
}) {
  const [value, setValue] = useState(initialName);
  const settledRef = useRef(false);

  const finish = (save: boolean) => {
    if (settledRef.current) return;
    settledRef.current = true;
    if (save) onCommit(value);
    else onCancel();
  };

  return (
    <input
      autoFocus
      dir="auto"
      aria-label="Row name"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onFocus={(e) => e.currentTarget.select()}
      onBlur={() => finish(true)}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === 'Enter') finish(true);
        if (e.key === 'Escape') finish(false);
      }}
      className="w-full bg-transparent text-xs font-medium text-foreground outline-none px-1 -mx-1 border border-ring rounded"
      style={style}
    />
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
