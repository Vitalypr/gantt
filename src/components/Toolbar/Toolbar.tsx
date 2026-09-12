import { useRef, useState } from 'react';
import {
  ZoomIn,
  ZoomOut,
  Undo2,
  Redo2,
  Save,
  Camera,
  Download,
  Upload,
  Plus,
  Maximize2,
  FolderOpen,
  GanttChart as GanttIcon,
  Waypoints,
  HelpCircle,
  Sun,
  Moon,
  Rows3,
  Printer,
  Flag,
  MoreHorizontal,
  LayoutTemplate,
  List,
  FileImage,
  ArrowLeftRight,
  AArrowDown,
  AArrowUp,
  CircleDot,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useStore } from '@/stores';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useUndo, useRedo, useCanUndo, useCanRedo } from '@/stores/hooks';
import { MIN_MONTH_WIDTH, MAX_MONTH_WIDTH, MIN_WEEK_WIDTH, MAX_WEEK_WIDTH, FONT_SIZE_STEPS, stepFontSize } from '@/constants/timeline';
import { effectiveFontSize } from '@/utils/activity';
import { MONTH_NAMES_SHORT } from '@/constants/timeline';
import { getTotalMonths, getTotalWeeks } from '@/utils/timeline';
import { fitUnitWidth } from '@/utils/layout';
import { hasAnyTopic } from '@/utils/topics';
import { activeChart } from '@/stores/selectors';
import { SaveDialog } from '@/components/Dialogs/SaveDialog';
import { AddRowDialog } from '@/components/Dialogs/AddRowDialog';
import { HelpDialog } from '@/components/Dialogs/HelpDialog';
import { MarkersDialog } from '@/components/Dialogs/MarkersDialog';
import { TemplateDialog } from '@/components/Dialogs/TemplateDialog';
import { useTheme } from '@/hooks/useTheme';
import { snapshotGantt, snapshotGanttSvg } from '@/utils/snapshot';
import { Toast, type ToastMessage } from './Toast';
import { setStorageFailureHandler } from '@/utils/persistence';
import { useEffect } from 'react';

function ToolbarSeparator() {
  return <div className="mx-1.5 h-5 w-px bg-border" />;
}

function ToolbarGroup({ children }: { children: React.ReactNode }) {
  return <div className="flex items-center gap-0.5">{children}</div>;
}

export function Toolbar() {
  const timelineMode = useStore((s) => s.timelineMode);
  const setTimelineMode = useStore((s) => s.setTimelineMode);

  const chartName = useStore((s) => s.timelineMode === 'weeks' ? s.weeksChart.name : s.chart.name);
  const setChartName = useStore((s) => s.setChartName);

  const monthWidth = useStore((s) => s.timelineMode === 'weeks' ? s.weekWidth : s.monthWidth);
  const effectiveUnitWidth = useStore((s) => s.timelineMode === 'weeks' ? s.effectiveWeekWidth : s.effectiveMonthWidth);
  const zoomIn = useStore((s) => s.zoomIn);
  const zoomOut = useStore((s) => s.zoomOut);
  const saveCurrentChart = useStore((s) => s.saveCurrentChart);
  const exportChart = useStore((s) => s.exportChart);
  const importChart = useStore((s) => s.importChart);

  const startYear = useStore((s) => s.timelineMode === 'weeks' ? s.weeksChart.startYear : s.chart.startYear);
  const startMonth = useStore((s) => s.timelineMode === 'weeks' ? s.weeksChart.startMonth : s.chart.startMonth);
  const endYear = useStore((s) => s.timelineMode === 'weeks' ? s.weeksChart.endYear : s.chart.endYear);
  const endMonth = useStore((s) => s.timelineMode === 'weeks' ? s.weeksChart.endMonth : s.chart.endMonth);
  const setDateRange = useStore((s) => s.setDateRange);
  const dependencyMode = useStore((s) => s.dependencyMode);
  const setDependencyMode = useStore((s) => s.setDependencyMode);
  const showQuarters = useStore((s) => s.showQuarters);
  const setShowQuarters = useStore((s) => s.setShowQuarters);
  const rowSize = useStore((s) => s.rowSize);
  const setRowSize = useStore((s) => s.setRowSize);

  const undo = useUndo();
  const redo = useRedo();
  const canUndo = useCanUndo();
  const canRedo = useCanRedo();

  // Font size acts on the selected bar. Mirrors the right-click submenu so the two cannot
  // drift apart — both go through `updateActivity`, so both are one undo entry.
  const selectedActivityIds = useStore((s) => s.selectedActivityIds);
  const selectedActivity = useStore((s) => {
    const first = s.selectedActivityIds[0];
    if (!first) return null;
    const chart = s.timelineMode === 'weeks' ? s.weeksChart : s.chart;
    return chart.activities.find((a) => a.id === first) ?? null;
  });
  const updateActivities = useStore((s) => s.updateActivities);
  const selectedFontSize = selectedActivity ? effectiveFontSize(selectedActivity) : null;
  const changeFontSize = (direction: 1 | -1) => {
    if (selectedFontSize === null) return;
    // Applies to the WHOLE selection in one commit.
    updateActivities(selectedActivityIds, { fontSize: stepFontSize(selectedFontSize, direction) });
  };

  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [addRowDialogOpen, setAddRowDialogOpen] = useState(false);
  const [helpDialogOpen, setHelpDialogOpen] = useState(false);
  const [markersDialogOpen, setMarkersDialogOpen] = useState(false);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const showLegend = useStore((s) => s.showLegend);
  const showStatus = useStore((s) => s.showStatus);
  const setShowStatus = useStore((s) => s.setShowStatus);
  const setShowLegend = useStore((s) => s.setShowLegend);
  const [toast, setToast] = useState<ToastMessage>(null);
  const [snapshotting, setSnapshotting] = useState(false);
  const chartDirection = useStore((s) => s.chartDirection);
  const toggleChartDirection = useStore((s) => s.toggleChartDirection);

  // A storage write that fails must say so; it used to be an invisible rejection inside a
  // timer while the user kept editing against storage that had stopped accepting anything.
  useEffect(() => {
    setStorageFailureHandler(() =>
      setToast({ kind: 'error', text: 'Could not save — browser storage is full or blocked.' }),
    );
    return () => setStorageFailureHandler(null);
  }, []);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const { theme, toggleTheme } = useTheme();

  const minWidth = timelineMode === 'weeks' ? MIN_WEEK_WIDTH : MIN_MONTH_WIDTH;
  const maxWidth = timelineMode === 'weeks' ? MAX_WEEK_WIDTH : MAX_MONTH_WIDTH;

  const handleNameBlur = () => {
    const value = nameInputRef.current?.value.trim();
    if (value && value !== chartName) {
      setChartName(value);
    }
  };

  const handleNameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      nameInputRef.current?.blur();
    }
  };

  const setMonthWidth = useStore((s) => s.setMonthWidth);
  const setWeekWidth = useStore((s) => s.setWeekWidth);

  const fitToView = () => {
    const scrollContainer = document.querySelector('[data-gantt-scroll]');
    if (!scrollContainer) return;

    const totalUnits = timelineMode === 'weeks'
      ? getTotalWeeks(startYear, endYear, startMonth, endMonth)
      : getTotalMonths(startYear, endYear, startMonth, endMonth);
    if (totalUnits <= 0) return;

    // Same arithmetic as the sidebar drag, so the button and the drag agree to the pixel.
    const state = useStore.getState();
    const clamped = fitUnitWidth({
      containerWidth: scrollContainer.clientWidth,
      sidebarWidth: state.sidebarWidth,
      leadingWidth: hasAnyTopic(activeChart(state).rows) ? state.topicWidth : 0,
      totalUnits,
      min: minWidth,
      max: maxWidth,
    });
    if (clamped === null) return;

    if (timelineMode === 'weeks') {
      setWeekWidth(clamped);
    } else {
      setMonthWidth(clamped);
    }
  };

  const handleImport = async () => {
    const success = await importChart();
    // `importChart` resolves false for a CANCELLED picker too, so this cannot claim failure.
    if (success) setToast({ kind: 'success', text: 'Chart imported.' });
  };

  const handleSnapshot = async () => {
    setSnapshotting(true);
    try {
      await snapshotGantt(chartName);
      setToast({ kind: 'success', text: 'Snapshot saved and copied to the clipboard.' });
    } catch {
      setToast({ kind: 'error', text: 'Could not capture the chart.' });
    } finally {
      setSnapshotting(false);
    }
  };

  const handleSnapshotSvg = async () => {
    setSnapshotting(true);
    try {
      await snapshotGanttSvg(chartName);
      setToast({ kind: 'success', text: 'Vector snapshot saved.' });
    } catch {
      setToast({ kind: 'error', text: 'Could not capture the chart.' });
    } finally {
      setSnapshotting(false);
    }
  };

  const handleSave = () => {
    saveCurrentChart();
    setToast({ kind: 'success', text: `Saved “${chartName}”.` });
  };

  const handleStartYearChange = (value: string) => {
    const y = parseInt(value, 10);
    if (!isNaN(y) && y >= 2000 && y <= 2100) {
      if (y < endYear || (y === endYear && startMonth <= endMonth)) {
        setDateRange(y, startMonth, endYear, endMonth);
      }
    }
  };

  const handleStartMonthChange = (value: string) => {
    const m = parseInt(value, 10);
    if (m >= 1 && m <= 12) {
      if (startYear < endYear || (startYear === endYear && m <= endMonth)) {
        setDateRange(startYear, m, endYear, endMonth);
      }
    }
  };

  const handleEndYearChange = (value: string) => {
    const y = parseInt(value, 10);
    if (!isNaN(y) && y >= 2000 && y <= 2100) {
      if (y > startYear || (y === startYear && endMonth >= startMonth)) {
        setDateRange(startYear, startMonth, y, endMonth);
      }
    }
  };

  const handleEndMonthChange = (value: string) => {
    const m = parseInt(value, 10);
    if (m >= 1 && m <= 12) {
      if (endYear > startYear || (endYear === startYear && m >= startMonth)) {
        setDateRange(startYear, startMonth, endYear, m);
      }
    }
  };

  return (
    <TooltipProvider delayDuration={400}>
      <div
        data-app-chrome
        className="flex h-11 shrink-0 items-center border-b border-border/60 bg-surface px-3 overflow-x-auto scrollbar-hide"
      >
        {/* Brand + Chart name */}
        <div className="flex items-center gap-2.5 mr-1">
          <div className="hidden lg:flex items-center gap-1.5 text-primary">
            <GanttIcon className="h-4 w-4" strokeWidth={2.5} />
            <span className="text-[11px] font-bold tracking-wide uppercase text-primary/70">High Level Gantt Chart</span>
          </div>
          <div className="hidden lg:block h-4 w-px bg-border" />
          <Input
            ref={nameInputRef}
            dir="auto"
            aria-label="Chart name"
            defaultValue={chartName}
            key={`${chartName}-${timelineMode}`}
            onBlur={handleNameBlur}
            onKeyDown={handleNameKeyDown}
            className="h-7 w-28 lg:w-52 border-transparent bg-transparent px-1.5 text-[13px] font-semibold tracking-tight text-foreground hover:bg-muted focus:bg-muted focus:border-transparent"
          />
        </div>

        <ToolbarSeparator />

        {/* Timeline mode toggle */}
        <ToolbarGroup>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex h-7 rounded-md border border-border/60 overflow-hidden">
                <button
                  className={`px-2 text-[10px] font-bold transition-colors ${
                    timelineMode === 'months'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-surface text-muted-foreground hover:bg-muted'
                  }`}
                  onClick={() => setTimelineMode('months')}
                >
                  Mo
                </button>
                <button
                  className={`px-2 text-[10px] font-bold transition-colors ${
                    timelineMode === 'weeks'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-surface text-muted-foreground hover:bg-muted'
                  }`}
                  onClick={() => setTimelineMode('weeks')}
                >
                  Wk
                </button>
              </div>
            </TooltipTrigger>
            <TooltipContent>Timeline Mode: {timelineMode === 'months' ? 'Months' : 'Weeks'}</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={chartDirection === 'rtl' ? 'default' : 'ghost'}
                size="icon"
                aria-label="Toggle chart direction"
                aria-pressed={chartDirection === 'rtl'}
                className="h-7 w-7"
                onClick={toggleChartDirection}
              >
                <ArrowLeftRight className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {chartDirection === 'rtl' ? 'Right-to-left (עברית)' : 'Left-to-right'}
            </TooltipContent>
          </Tooltip>
        </ToolbarGroup>

        <ToolbarSeparator />

        {/* Add Row — hidden on mobile */}
        <ToolbarGroup>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="hidden lg:inline-flex h-7 gap-1.5 px-2.5 text-xs font-medium"
                onClick={() => setAddRowDialogOpen(true)}
              >
                <Plus className="h-3.5 w-3.5" />
                <span className="hidden lg:inline">Row</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Add Row</TooltipContent>
          </Tooltip>
        </ToolbarGroup>

        <ToolbarSeparator />

        {/* Date range controls — stacked on mobile, inline on desktop */}
        <ToolbarGroup>
          {/* Desktop: horizontal layout */}
          <div className="hidden lg:flex items-center gap-1 text-[10px] text-muted-foreground">
            <select
              value={startMonth}
              onChange={(e) => handleStartMonthChange(e.target.value)}
              className="h-6 rounded border border-border/60 bg-surface px-1 text-[10px] text-foreground outline-none cursor-pointer"
            >
              {MONTH_NAMES_SHORT.map((name, i) => (
                <option key={i} value={i + 1}>{name}</option>
              ))}
            </select>
            <input
              type="number"
              value={startYear}
              onChange={(e) => handleStartYearChange(e.target.value)}
              className="h-6 w-14 rounded border border-border/60 bg-surface px-1 text-[10px] text-foreground outline-none text-center tabular-nums"
              min={2000}
              max={2100}
            />
            <span className="text-muted-foreground/60 px-0.5">&ndash;</span>
            <select
              value={endMonth}
              onChange={(e) => handleEndMonthChange(e.target.value)}
              className="h-6 rounded border border-border/60 bg-surface px-1 text-[10px] text-foreground outline-none cursor-pointer"
            >
              {MONTH_NAMES_SHORT.map((name, i) => (
                <option key={i} value={i + 1}>{name}</option>
              ))}
            </select>
            <input
              type="number"
              value={endYear}
              onChange={(e) => handleEndYearChange(e.target.value)}
              className="h-6 w-14 rounded border border-border/60 bg-surface px-1 text-[10px] text-foreground outline-none text-center tabular-nums"
              min={2000}
              max={2100}
            />
          </div>
          {/* Mobile: month + year in one row */}
          <div className="flex lg:hidden items-center gap-0.5 text-[10px] text-muted-foreground">
            <select
              value={startMonth}
              onChange={(e) => handleStartMonthChange(e.target.value)}
              className="h-5 rounded border border-border/60 bg-surface px-0.5 text-[9px] text-foreground outline-none cursor-pointer"
            >
              {MONTH_NAMES_SHORT.map((name, i) => (
                <option key={i} value={i + 1}>{name}</option>
              ))}
            </select>
            <input
              type="number"
              value={startYear}
              onChange={(e) => handleStartYearChange(e.target.value)}
              className="h-5 w-11 rounded border border-border/60 bg-surface px-0.5 text-[9px] text-foreground outline-none text-center tabular-nums"
              min={2000}
              max={2100}
            />
            <span className="text-muted-foreground/60">&ndash;</span>
            <select
              value={endMonth}
              onChange={(e) => handleEndMonthChange(e.target.value)}
              className="h-5 rounded border border-border/60 bg-surface px-0.5 text-[9px] text-foreground outline-none cursor-pointer"
            >
              {MONTH_NAMES_SHORT.map((name, i) => (
                <option key={i} value={i + 1}>{name}</option>
              ))}
            </select>
            <input
              type="number"
              value={endYear}
              onChange={(e) => handleEndYearChange(e.target.value)}
              className="h-5 w-11 rounded border border-border/60 bg-surface px-0.5 text-[9px] text-foreground outline-none text-center tabular-nums"
              min={2000}
              max={2100}
            />
          </div>
        </ToolbarGroup>

        <ToolbarSeparator />

        {/* Zoom controls */}
        <ToolbarGroup>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Zoom out" className="h-7 w-7" onClick={zoomOut} disabled={monthWidth <= minWidth}>
                <ZoomOut className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Zoom Out</TooltipContent>
          </Tooltip>

          <span className="hidden lg:inline min-w-[2.5rem] text-center text-[10px] font-medium tabular-nums text-muted-foreground/70">
            {Math.round(effectiveUnitWidth)}px
          </span>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Zoom in" className="h-7 w-7" onClick={zoomIn} disabled={monthWidth >= maxWidth}>
                <ZoomIn className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Zoom In</TooltipContent>
          </Tooltip>
        </ToolbarGroup>

        <ToolbarSeparator />

        {/* Fit to view */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Fit chart to view" className="h-7 w-7" onClick={fitToView}>
              <Maximize2 className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Fit Chart to View</TooltipContent>
        </Tooltip>

        {/* Quarter row toggle — only visible in months mode */}
        {timelineMode === 'months' && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={showQuarters ? 'default' : 'ghost'}
                size="icon"
                aria-label="Toggle quarter row"
                aria-pressed={showQuarters}
                className="h-7 w-7 text-meta font-bold"
                onClick={() => setShowQuarters(!showQuarters)}
              >
                Qr
              </Button>
            </TooltipTrigger>
            <TooltipContent>{showQuarters ? 'Hide Quarters' : 'Show Quarters'}</TooltipContent>
          </Tooltip>
        )}

        {/* Status rails — one switch for the whole chart, so a plan can be reviewed with
            delivery state on and then exported without it. */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={showStatus ? 'default' : 'ghost'}
              size="icon"
              aria-label={showStatus ? 'Hide status on all bars' : 'Show status on all bars'}
              aria-pressed={showStatus}
              className="h-7 w-7"
              onClick={() => setShowStatus(!showStatus)}
            >
              <CircleDot className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{showStatus ? 'Hide Status (all bars)' : 'Show Status (all bars)'}</TooltipContent>
        </Tooltip>

        {/* Row height cycle */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              aria-label={`Row height: ${rowSize}`}
              className="h-7 w-7"
              onClick={() => {
                const next = rowSize === 'small' ? 'medium' : rowSize === 'medium' ? 'large' : 'small';
                setRowSize(next);
              }}
            >
              <Rows3 className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Row Height: {rowSize === 'small' ? 'Small' : rowSize === 'medium' ? 'Medium' : 'Large'}</TooltipContent>
        </Tooltip>

        <ToolbarSeparator />

        {/* Font size for the selected bar */}
        <ToolbarGroup>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Decrease label font size"
                className="h-7 w-7"
                onClick={() => changeFontSize(-1)}
                disabled={selectedFontSize === null || selectedFontSize <= FONT_SIZE_STEPS[0]!}
              >
                <AArrowDown className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {selectedActivity ? `Smaller Label (${selectedFontSize}px)` : 'Select a bar to resize its label'}
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Increase label font size"
                className="h-7 w-7"
                onClick={() => changeFontSize(1)}
                disabled={
                  selectedFontSize === null ||
                  selectedFontSize >= FONT_SIZE_STEPS[FONT_SIZE_STEPS.length - 1]!
                }
              >
                <AArrowUp className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {selectedActivity ? `Larger Label (${selectedFontSize}px)` : 'Select a bar to resize its label'}
            </TooltipContent>
          </Tooltip>
        </ToolbarGroup>

        <ToolbarSeparator />

        {/* Dependency mode toggle */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={dependencyMode ? 'default' : 'ghost'}
              size="sm"
              aria-label="Toggle dependency mode"
              aria-pressed={dependencyMode}
              className="h-7 gap-1.5 px-1.5 lg:px-2.5 text-label font-medium"
              onClick={() => setDependencyMode(!dependencyMode)}
            >
              <Waypoints className="h-3.5 w-3.5" />
              <span className="hidden lg:inline">Connect</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Toggle Dependency Mode</TooltipContent>
        </Tooltip>

        <div className="hidden lg:block lg:flex-1" />

        {/* Undo/Redo */}
        <ToolbarGroup>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Undo" className="h-7 w-7" onClick={undo} disabled={!canUndo}>
                <Undo2 className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Undo (Ctrl+Z)</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Redo" className="h-7 w-7" onClick={redo} disabled={!canRedo}>
                <Redo2 className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Redo (Ctrl+Shift+Z)</TooltipContent>
          </Tooltip>
        </ToolbarGroup>

        <ToolbarSeparator />

        {/* File operations */}
        <ToolbarGroup>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Save chart" className="h-7 w-7" onClick={handleSave}>
                <Save className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Save</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Open saved charts" className="h-7 w-7" onClick={() => setSaveDialogOpen(true)}>
                <FolderOpen className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Open Saved Charts</TooltipContent>
          </Tooltip>

        </ToolbarGroup>

        <ToolbarSeparator />

        {/* Everything below is used rarely; it lives behind one affordance instead of
            extending a strip that already scrolled out of reach with no scrollbar. */}
        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="More actions" className="h-7 w-7">
                  <MoreHorizontal className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent>More: export, import, snapshots, print</TooltipContent>
          </Tooltip>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => setShowLegend(!showLegend)}>
              <List className="mr-2 h-3.5 w-3.5" />
              {showLegend ? 'Hide legend' : 'Show legend'}
            </DropdownMenuItem>
            <DropdownMenuSeparator className="my-1 h-px bg-border" />
            <DropdownMenuItem onSelect={() => setTemplateDialogOpen(true)}>
              <LayoutTemplate className="mr-2 h-3.5 w-3.5" />
              Start from a template…
            </DropdownMenuItem>
            <DropdownMenuSeparator className="my-1 h-px bg-border" />
            <DropdownMenuItem onSelect={() => void exportChart()}>
              <Download className="mr-2 h-3.5 w-3.5" />
              Export JSON
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => void handleImport()}>
              <Upload className="mr-2 h-3.5 w-3.5" />
              Import JSON
            </DropdownMenuItem>
            <DropdownMenuSeparator className="my-1 h-px bg-border" />
            <DropdownMenuItem disabled={snapshotting} onSelect={() => void handleSnapshot()}>
              <Camera className="mr-2 h-3.5 w-3.5" />
              Snapshot (JPEG)
            </DropdownMenuItem>
            <DropdownMenuItem disabled={snapshotting} onSelect={() => void handleSnapshotSvg()}>
              <FileImage className="mr-2 h-3.5 w-3.5" />
              Snapshot (SVG)
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => window.print()}>
              <Printer className="mr-2 h-3.5 w-3.5" />
              Print / Save as PDF
            </DropdownMenuItem>
            <DropdownMenuSeparator className="my-1 h-px bg-border" />
            <DropdownMenuItem onSelect={() => setMarkersDialogOpen(true)}>
              <Flag className="mr-2 h-3.5 w-3.5" />
              Markers…
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setHelpDialogOpen(true)}>
              <HelpCircle className="mr-2 h-3.5 w-3.5" />
              Help
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <ToolbarSeparator />

        {/* Theme toggle */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Toggle theme" className="h-7 w-7" onClick={toggleTheme}>
              {theme === 'dark' ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</TooltipContent>
        </Tooltip>

        <SaveDialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen} />
        <AddRowDialog open={addRowDialogOpen} onOpenChange={setAddRowDialogOpen} />
        <HelpDialog open={helpDialogOpen} onOpenChange={setHelpDialogOpen} />
        <MarkersDialog open={markersDialogOpen} onOpenChange={setMarkersDialogOpen} />
        <TemplateDialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen} />
        <Toast message={toast} onDismiss={() => setToast(null)} />
      </div>
    </TooltipProvider>
  );
}
