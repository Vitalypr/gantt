import { useRef, useMemo, useEffect, useState } from 'react';
import { useStore } from '@/stores';
import { ROW_SIZE_MAP, TOPIC_GAP } from '@/constants/timeline';
import { useDoubleTap } from '@/hooks/useDoubleTap';
import { getTotalMonths, getTotalWeeks } from '@/utils/timeline';
import { bodyHeightFor, getHeaderHeight } from '@/utils/layout';
import { resolveRowGroups } from '@/utils/rowGroups';
import { resolveTopicBands, hasAnyTopic } from '@/utils/topics';
import { TopicColumn } from '@/components/Sidebar/TopicColumn';
import { useChartDirection } from '@/hooks/useChartDirection';
import { useAnchoredZoom } from '@/hooks/useAnchoredZoom';
import { TimelineHeader } from '@/components/Timeline/TimelineHeader';
import { TimelineGrid } from '@/components/Timeline/TimelineGrid';
import { HolidayLayer } from '@/components/Timeline/HolidayLayer';
import { MarkerLayer } from '@/components/Timeline/MarkerLayer';
import { AlignmentGuides } from '@/components/Timeline/AlignmentGuides';
import { RollupBars } from '@/components/Timeline/RollupBars';
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
import { cn } from '@/lib/utils';

export type RowLayout = {
  rowId: string;
  activityIds: string[];
  y: number;
  mergedWithNext?: boolean;
  isGroup?: boolean;
  collapsed?: boolean;
  /** A topic band sits directly above / below this row, so it closes its box on that side. */
  gapBefore?: boolean;
  gapAfter?: boolean;
};

export function GanttChart() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const sidebarWidth = useStore((s) => s.sidebarWidth);
  const timelineMode = useStore((s) => s.timelineMode);

  // Read from active chart based on mode
  const monthWidth = useStore((s) => s.timelineMode === 'weeks' ? s.weekWidth : s.monthWidth);
  const startYear = useStore((s) => s.timelineMode === 'weeks' ? s.weeksChart.startYear : s.chart.startYear);
  const startMonth = useStore((s) => s.timelineMode === 'weeks' ? s.weeksChart.startMonth : s.chart.startMonth);
  const endYear = useStore((s) => s.timelineMode === 'weeks' ? s.weeksChart.endYear : s.chart.endYear);
  const endMonth = useStore((s) => s.timelineMode === 'weeks' ? s.weeksChart.endMonth : s.chart.endMonth);
  const chartRows = useStore((s) => s.timelineMode === 'weeks' ? s.weeksChart.rows : s.chart.rows);
  const chartActivities = useStore((s) => s.timelineMode === 'weeks' ? s.weeksChart.activities : s.chart.activities);
  const addRow = useStore((s) => s.addRow);
  const setEffectiveMonthWidth = useStore((s) => s.setEffectiveMonthWidth);
  const setEffectiveWeekWidth = useStore((s) => s.setEffectiveWeekWidth);

  const topicWidth = useStore((s) => s.topicWidth);
  const showTopics = useStore((s) => s.showTopics);
  const setShowTopics = useStore((s) => s.setShowTopics);
  // Shown by the toolbar switch, not by whether a topic happens to exist. Deriving it from the
  // data made the feature invisible on a blank chart — you had to already know to right-click
  // a row before anything appeared, which is the trap the resize handle fell into too.
  const topicsShown = showTopics;
  const leadingWidth = topicsShown ? topicWidth : 0;
  const chartId = useStore((s) => (s.timelineMode === 'weeks' ? s.weeksChart.id : s.chart.id));

  // A chart that arrives WITH topics reveals the column by itself — otherwise importing or
  // opening one would show nothing and look like the topics had been lost.
  useEffect(() => {
    if (hasAnyTopic(chartRows) && !showTopics) setShowTopics(true);
    // Keyed on the chart, not on the rows: re-running per edit would fight the switch every
    // time the user turned it off while topics existed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chartId]);

  const { isRtl } = useChartDirection();
  const checkSidebarDoubleTap = useDoubleTap();
  const dragCreate = useDragCreate();
  const dragResize = useDragResize();
  const resizeSidebar = useResizeSidebar();

  const totalUnits = timelineMode === 'weeks'
    ? getTotalWeeks(startYear, endYear, startMonth, endMonth)
    : getTotalMonths(startYear, endYear, startMonth, endMonth);

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

  // Compute effective unit width: ensure chart fills viewport. The topic column is a third
  // fixed track, so it comes out of the space the units divide.
  const availableWidth = containerWidth - sidebarWidth - leadingWidth;
  const fitWidth = totalUnits > 0 ? availableWidth / totalUnits : monthWidth;
  const effectiveUnitWidth = Math.max(monthWidth, fitWidth);

  useEffect(() => {
    if (timelineMode === 'weeks') {
      setEffectiveWeekWidth(effectiveUnitWidth);
    } else {
      setEffectiveMonthWidth(effectiveUnitWidth);
    }
  }, [effectiveUnitWidth, timelineMode, setEffectiveMonthWidth, setEffectiveWeekWidth]);

  const timelineWidth = totalUnits * effectiveUnitWidth;
  const { zoomAt } = useAnchoredZoom(scrollRef, effectiveUnitWidth);

  const dependencyMode = useStore((s) => s.dependencyMode);
  const showQuarters = useStore((s) => s.showQuarters);
  const rowSize = useStore((s) => s.rowSize);
  const rowHeight = ROW_SIZE_MAP[rowSize];

  // A collapsed group hides its member rows, so layout runs over the VISIBLE set. Every
  // consumer (sidebar, body, arrows, guides) reads this one list, which is what keeps the
  // sidebar and the canvas from disagreeing about which rows exist.
  const { visible: visibleRows, rollups } = useMemo(
    () => resolveRowGroups(chartRows, chartActivities),
    [chartRows, chartActivities],
  );

  // Topic cells and the gaps between them. One resolution, shared by the layout below and by
  // the column itself, so the rotated cell and the rows it spans cannot disagree.
  const topics = useMemo(() => resolveTopicBands(visibleRows), [visibleRows]);
  const rowLayout = useMemo(() => {
    const rows: RowLayout[] = [];
    // Where the empty bands between topic blocks fall, so the canvas can paint over them.
    const gaps: { y: number; height: number }[] = [];
    let y = 0;
    for (const row of visibleRows) {
      // Empty canvas between topic blocks. It is not a row: nothing can be dropped in it, and
      // it only exists once some row actually carries a topic.
      const hasGap = topicsShown && topics.gapBefore.has(row.id);
      if (hasGap) {
        gaps.push({ y, height: TOPIC_GAP });
        y += TOPIC_GAP;
      }
      rows.push({
        rowId: row.id,
        activityIds: row.activityIds,
        y,
        gapBefore: hasGap,
        mergedWithNext: row.mergedWithNext,
        isGroup: row.isGroup,
        collapsed: row.collapsed,
      });
      y += rowHeight;
    }
    // The row a band opens below is the one that has to close itself on its bottom edge.
    for (const g of gaps) {
      const above = rows.filter((r) => r.y + rowHeight <= g.y).pop();
      if (above) above.gapAfter = true;
    }

    return { rows, gaps, totalHeight: y };
  }, [visibleRows, rowHeight, topics, topicsShown]);
  const dragMove = useDragMove(rowLayout.rows);
  const dragRowSpan = useDragRowSpan(rowLayout.rows);
  const dragConnect = useDragConnect(rowLayout.rows, effectiveUnitWidth);

  const headerHeight = getHeaderHeight(timelineMode, showQuarters);
  const bodyHeight = bodyHeightFor(rowLayout.totalHeight);
  const hasRows = chartRows.length > 0;

  // The grid has four cells, or six once a topic column exists. Their DOM order decides which
  // track each lands in, so the order and the track order are swapped together, in one place.
  const topicCornerCell = (
    <div
      key="topic-corner"
      className={cn(
        'sticky top-0 z-30 border-b bg-background',
        isRtl ? 'right-0 border-l' : 'left-0 border-r',
      )}
      style={{ width: leadingWidth, height: headerHeight }}
    />
  );

  const topicCell = (
    <div
      key="topic"
      className={cn('sticky z-10 bg-background', isRtl ? 'right-0 border-l' : 'left-0 border-r')}
    >
      <TopicColumn
        rows={rowLayout.rows}
        cells={topics.cells}
        width={leadingWidth}
        totalHeight={bodyHeight}
      />
    </div>
  );

  const cornerCell = (
    <div
      key="corner"
      className={cn('sticky top-0 z-30 border-b bg-background', isRtl ? 'border-l' : 'border-r')}
      style={{
        width: sidebarWidth,
        height: headerHeight,
        // Offset by the topic track. Sticking both to 0 stacks them: the topic column would
        // cover the sidebar's outer edge rather than sit beside it.
        [isRtl ? 'right' : 'left']: leadingWidth,
      }}
    />
  );

  const headerCell = (
    <div key="header" className="sticky top-0 z-20">
      <TimelineHeader
        startYear={startYear}
        endYear={endYear}
        chartStartMonth={startMonth}
        chartEndMonth={endMonth}
        unitWidth={effectiveUnitWidth}
        totalWidth={timelineWidth}
        showQuarters={showQuarters}
        timelineMode={timelineMode}
      />
    </div>
  );

  const sidebarCell = (
    <div
      key="sidebar"
      className={cn('sticky z-10 bg-background', isRtl ? 'border-l' : 'border-r')}
      style={{ [isRtl ? 'right' : 'left']: leadingWidth }}
      onDoubleClick={(e) => {
        // Double-click on empty sidebar area adds a new row
        if (!(e.target as HTMLElement).closest('[data-sidebar-row]')) {
          addRow();
        }
      }}
      onPointerDown={(e) => {
        // Touch/pen only — a mouse is served by onDoubleClick above, and running both
        // adds two rows for any double-click faster than DOUBLE_TAP_DELAY.
        if ((e.target as HTMLElement).closest('[data-sidebar-row]')) return;
        if (checkSidebarDoubleTap(e)) {
          addRow();
        }
      }}
    >
      <Sidebar
        rows={rowLayout.rows}
        sidebarWidth={sidebarWidth}
        onResizePointerDown={resizeSidebar.onPointerDown}
        onResizeStep={resizeSidebar.onStep}
      />
    </div>
  );

  const bodyCell = (
    <div key="body" className="relative" data-timeline-body style={{ height: bodyHeight }}>
      <TimelineGrid
        totalUnits={totalUnits}
        unitWidth={effectiveUnitWidth}
        rows={rowLayout.rows}
        totalHeight={bodyHeight}
        chartStartMonth={startMonth}
        startYear={startYear}
        endYear={endYear}
        endMonth={endMonth}
        timelineMode={timelineMode}
      />
      {/* The band between topic blocks is empty canvas, not a row. Painted straight after the
          grid so it cuts the month lines — but BEFORE the holiday, today and marker layers, so
          everything that marks a DATE runs through it unbroken. A holiday that stopped at a
          topic break would be telling the reader the holiday stops there. */}
      {rowLayout.gaps.map((g) => (
        <div
          key={`gap-${g.y}`}
          data-topic-gap
          className="pointer-events-none absolute left-0 bg-background"
          style={{ top: g.y, height: g.height, width: timelineWidth }}
        />
      ))}

      <HolidayLayer
        startYear={startYear}
        startMonth={startMonth}
        endYear={endYear}
        endMonth={endMonth}
        unitWidth={effectiveUnitWidth}
        totalUnits={totalUnits}
        totalHeight={bodyHeight}
        timelineMode={timelineMode}
      />
      <TodayMarker
        startYear={startYear}
        chartStartMonth={startMonth}
        unitWidth={effectiveUnitWidth}
        totalUnits={totalUnits}
        totalHeight={rowLayout.totalHeight}
        timelineMode={timelineMode}
      />
      <MarkerLayer
        startYear={startYear}
        startMonth={startMonth}
        unitWidth={effectiveUnitWidth}
        totalUnits={totalUnits}
        totalHeight={bodyHeight}
        timelineMode={timelineMode}
      />
      <TimelineBody
        rows={rowLayout.rows}
        monthWidth={effectiveUnitWidth}
        totalUnits={totalUnits}
        dragCreate={dragCreate}
        dragMove={dragMove}
        dragResize={dragResize}
        dragRowSpan={dragRowSpan}
        onAnchorPointerDown={dependencyMode ? dragConnect.onAnchorPointerDown : undefined}
      />
      {/* Mounted unconditionally: `snapshotGantt` rasterises the live DOM, so a layer that
          only exists in connect mode is a layer missing from every exported image. It is
          pointer-events:none, so mounting it always is behaviourally inert. */}
      <DependencyLayer
        rows={rowLayout.rows}
        monthWidth={effectiveUnitWidth}
        totalUnits={totalUnits}
        timelineWidth={timelineWidth}
        bodyHeight={bodyHeight}
        dragConnect={dependencyMode ? dragConnect.dragState : null}
      />

      <RollupBars
        rollups={rollups}
        rows={rowLayout.rows}
        unitWidth={effectiveUnitWidth}
        totalUnits={totalUnits}
        rowHeight={rowHeight}
      />

      <AlignmentGuides
        units={dragMove.dragState?.guides ?? []}
        unitWidth={effectiveUnitWidth}
        totalUnits={totalUnits}
        totalHeight={bodyHeight}
      />


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
  );

  return (
    <div
      ref={scrollRef}
      data-gantt-scroll
      className="h-full overflow-auto"
      onWheel={(e) => {
        // Ctrl/Cmd + wheel is the universal zoom gesture, and it is also what a trackpad
        // pinch reports. Anchored at the pointer so the chart does not slide away.
        if (!e.ctrlKey && !e.metaKey) return;
        e.preventDefault();
        zoomAt(e.deltaY < 0 ? 1 : -1, e.clientX);
      }}
    >
      <div
        className="grid"
        data-gantt-grid
        style={{
          // Track order and DOM child order are swapped together. Deliberately NOT
          // `direction: rtl` on the grid — that inherits into the timeline and inverts the
          // scroll origin — and deliberately not `gridColumn` on the children, because
          // sparse auto-placement would spill them into extra rows.
          gridTemplateColumns: isRtl
            ? `${timelineWidth}px ${sidebarWidth}px${topicsShown ? ` ${leadingWidth}px` : ''}`
            : `${topicsShown ? `${leadingWidth}px ` : ''}${sidebarWidth}px ${timelineWidth}px`,
          gridTemplateRows: `${headerHeight}px ${bodyHeight}px`,
        }}
      >
        {isRtl
          ? [
              headerCell, cornerCell, ...(topicsShown ? [topicCornerCell] : []),
              bodyCell, sidebarCell, ...(topicsShown ? [topicCell] : []),
            ]
          : [
              ...(topicsShown ? [topicCornerCell] : []), cornerCell, headerCell,
              ...(topicsShown ? [topicCell] : []), sidebarCell, bodyCell,
            ]}
      </div>
    </div>
  );
}
