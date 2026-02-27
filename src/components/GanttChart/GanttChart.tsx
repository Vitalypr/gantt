import { useRef, useMemo, useEffect, useState } from 'react';
import { useStore } from '@/stores';
import { ROW_SIZE_MAP } from '@/constants/timeline';
import { getTotalMonths } from '@/utils/timeline';
import { TimelineHeader } from '@/components/Timeline/TimelineHeader';
import { TimelineGrid } from '@/components/Timeline/TimelineGrid';
import { TimelineBody } from '@/components/Timeline/TimelineBody';
import { TodayMarker } from '@/components/Timeline/TodayMarker';
import { Sidebar } from '@/components/Sidebar/Sidebar';
import { useDragCreate } from '@/hooks/useDragCreate';
import { useDragMove } from '@/hooks/useDragMove';
import { useDragResize } from '@/hooks/useDragResize';
import { useDragRowSpan } from '@/hooks/useDragRowSpan';
import { useDragConnect } from '@/hooks/useDragConnect';
import { useResizeSidebar } from '@/hooks/useResizeSidebar';
import { DependencyLayer } from '@/components/DependencyArrows/DependencyLayer';
import { Plus } from 'lucide-react';

export type RowLayout = {
  rowId: string;
  activityIds: string[];
  y: number;
  mergedWithNext?: boolean;
};

export function GanttChart() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const sidebarWidth = useStore((s) => s.sidebarWidth);
  const monthWidth = useStore((s) => s.monthWidth);
  const startYear = useStore((s) => s.chart.startYear);
  const startMonth = useStore((s) => s.chart.startMonth);
  const endYear = useStore((s) => s.chart.endYear);
  const endMonth = useStore((s) => s.chart.endMonth);
  const chartRows = useStore((s) => s.chart.rows);
  const addRow = useStore((s) => s.addRow);
  const setEffectiveMonthWidth = useStore((s) => s.setEffectiveMonthWidth);

  const sidebarLastTapRef = useRef<{ time: number; x: number; y: number }>({ time: 0, x: 0, y: 0 });
  const dragCreate = useDragCreate();
  const dragMove = useDragMove();
  const dragResize = useDragResize();
  const dragRowSpan = useDragRowSpan();
  const resizeSidebar = useResizeSidebar();

  const totalMonths = getTotalMonths(startYear, endYear, startMonth, endMonth);

  // Track container width for adaptive zoom
  const [containerWidth, setContainerWidth] = useState(window.innerWidth);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    setContainerWidth(el.clientWidth);
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Compute effective month width: ensure chart fills viewport
  const availableWidth = containerWidth - sidebarWidth;
  const fitWidth = availableWidth / totalMonths;
  const effectiveMonthWidth = Math.max(monthWidth, fitWidth);

  useEffect(() => {
    setEffectiveMonthWidth(effectiveMonthWidth);
  }, [effectiveMonthWidth, setEffectiveMonthWidth]);

  const timelineWidth = totalMonths * effectiveMonthWidth;

  const dependencyMode = useStore((s) => s.dependencyMode);
  const showQuarters = useStore((s) => s.showQuarters);
  const rowSize = useStore((s) => s.rowSize);
  const rowHeight = ROW_SIZE_MAP[rowSize];

  const rowLayout = useMemo(() => {
    const rows: RowLayout[] = [];
    let y = 0;
    const sorted = [...chartRows].sort((a, b) => a.order - b.order);
    for (const row of sorted) {
      rows.push({
        rowId: row.id,
        activityIds: row.activityIds,
        y,
        mergedWithNext: row.mergedWithNext,
      });
      y += rowHeight;
    }
    return { rows, totalHeight: y };
  }, [chartRows, rowHeight]);
  const dragConnect = useDragConnect(rowLayout.rows, effectiveMonthWidth);

  const TIER_HEIGHT = 28;
  const headerHeight = showQuarters ? TIER_HEIGHT * 3 : TIER_HEIGHT * 2;
  const bodyHeight = Math.max(rowLayout.totalHeight, 300);
  const hasRows = chartRows.length > 0;

  return (
    <div
      ref={scrollRef}
      data-gantt-scroll
      className="h-full overflow-auto"
    >
      <div
        className="grid"
        style={{
          gridTemplateColumns: `${sidebarWidth}px ${timelineWidth}px`,
          gridTemplateRows: `${headerHeight}px ${bodyHeight}px`,
        }}
      >
        {/* Top-left corner: sticky top + left */}
        <div
          className="sticky left-0 top-0 z-30 border-b border-r bg-background"
          style={{ width: sidebarWidth, height: headerHeight }}
        />

        {/* Timeline header: sticky top */}
        <div className="sticky top-0 z-20">
          <TimelineHeader
            startYear={startYear}
            endYear={endYear}
            chartStartMonth={startMonth}
            chartEndMonth={endMonth}
            monthWidth={effectiveMonthWidth}
            totalWidth={timelineWidth}
            showQuarters={showQuarters}
          />
        </div>

        {/* Sidebar: sticky left */}
        <div
          className="sticky left-0 z-10 border-r bg-background"
          onDoubleClick={(e) => {
            // Double-click on empty sidebar area adds a new row
            if (!(e.target as HTMLElement).closest('[data-sidebar-row]')) {
              addRow();
            }
          }}
          onPointerDown={(e) => {
            // Double-tap detection for touch (dblclick doesn't fire on touch)
            if ((e.target as HTMLElement).closest('[data-sidebar-row]')) return;
            const now = Date.now();
            const last = sidebarLastTapRef.current;
            if (now - last.time < 300 && Math.abs(e.clientX - last.x) < 25 && Math.abs(e.clientY - last.y) < 25) {
              sidebarLastTapRef.current = { time: 0, x: 0, y: 0 };
              addRow();
              return;
            }
            sidebarLastTapRef.current = { time: now, x: e.clientX, y: e.clientY };
          }}
        >
          <Sidebar
            rows={rowLayout.rows}
            sidebarWidth={sidebarWidth}
            onResizePointerDown={resizeSidebar.onPointerDown}
          />
        </div>

        {/* Timeline body */}
        <div className="relative" data-timeline-body style={{ height: bodyHeight }}>
          <TimelineGrid
            totalMonths={totalMonths}
            monthWidth={effectiveMonthWidth}
            rows={rowLayout.rows}
            totalHeight={bodyHeight}
            chartStartMonth={startMonth}
          />
          <TodayMarker startYear={startYear} chartStartMonth={startMonth} monthWidth={effectiveMonthWidth} totalHeight={rowLayout.totalHeight} />
          <TimelineBody
            rows={rowLayout.rows}
            monthWidth={effectiveMonthWidth}
            sidebarWidth={sidebarWidth}
            dragCreate={dragCreate}
            dragMove={dragMove}
            dragResize={dragResize}
            dragRowSpan={dragRowSpan}
            onAnchorPointerDown={dependencyMode ? dragConnect.onAnchorPointerDown : undefined}
          />
          {dependencyMode && (
            <DependencyLayer
              rows={rowLayout.rows}
              monthWidth={effectiveMonthWidth}
              timelineWidth={timelineWidth}
              bodyHeight={bodyHeight}
              dragConnect={dragConnect.dragState}
            />
          )}

          {/* Empty state */}
          {!hasRows && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="pointer-events-auto text-center text-muted-foreground">
                <Plus className="mx-auto mb-2 h-8 w-8 opacity-40" />
                <p className="text-sm">Add a row to get started</p>
                <p className="text-xs opacity-60">Use the + button in the toolbar</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
