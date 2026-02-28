import { useRef, useState } from 'react';
import {
  ZoomIn,
  ZoomOut,
  Undo2,
  Redo2,
  Save,
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
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useStore } from '@/stores';
import { useUndo, useRedo } from '@/stores/hooks';
import { MIN_MONTH_WIDTH, MAX_MONTH_WIDTH, MIN_WEEK_WIDTH, MAX_WEEK_WIDTH } from '@/constants/timeline';
import { MONTH_NAMES_SHORT } from '@/constants/timeline';
import { getTotalMonths, getTotalWeeks } from '@/utils/timeline';
import { SaveDialog } from '@/components/Dialogs/SaveDialog';
import { AddRowDialog } from '@/components/Dialogs/AddRowDialog';
import { HelpDialog } from '@/components/Dialogs/HelpDialog';
import { useTheme } from '@/hooks/useTheme';

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

  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [addRowDialogOpen, setAddRowDialogOpen] = useState(false);
  const [helpDialogOpen, setHelpDialogOpen] = useState(false);
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

    const sw = useStore.getState().sidebarWidth;
    const availableWidth = scrollContainer.clientWidth - sw;
    const ideal = Math.floor(availableWidth / totalUnits);
    const clamped = Math.max(minWidth, Math.min(maxWidth, ideal));

    if (timelineMode === 'weeks') {
      setWeekWidth(clamped);
    } else {
      setMonthWidth(clamped);
    }
  };

  const handleImport = async () => {
    const success = await importChart();
    if (!success) {
      alert('Failed to import chart. Please check the file format.');
    }
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
      <div className="flex h-11 shrink-0 items-center border-b border-border/60 bg-surface px-3 overflow-x-auto scrollbar-hide">
        {/* Brand + Chart name */}
        <div className="flex items-center gap-2.5 mr-1">
          <div className="hidden lg:flex items-center gap-1.5 text-primary">
            <GanttIcon className="h-4 w-4" strokeWidth={2.5} />
            <span className="text-[11px] font-bold tracking-wide uppercase text-primary/70">High Level Gantt Chart</span>
          </div>
          <div className="hidden lg:block h-4 w-px bg-border" />
          <Input
            ref={nameInputRef}
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
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={zoomOut} disabled={monthWidth <= minWidth}>
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
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={zoomIn} disabled={monthWidth >= maxWidth}>
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
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={fitToView}>
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
                className="h-7 w-7 text-[11px] font-bold"
                onClick={() => setShowQuarters(!showQuarters)}
              >
                Qr
              </Button>
            </TooltipTrigger>
            <TooltipContent>{showQuarters ? 'Hide Quarters' : 'Show Quarters'}</TooltipContent>
          </Tooltip>
        )}

        {/* Row height cycle */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
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

        {/* Dependency mode toggle */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={dependencyMode ? 'default' : 'ghost'}
              size="sm"
              className="h-7 gap-1.5 px-1.5 lg:px-2.5 text-xs font-medium"
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
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={undo}>
                <Undo2 className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Undo (Ctrl+Z)</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={redo}>
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
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={saveCurrentChart}>
                <Save className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Save</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setSaveDialogOpen(true)}>
                <FolderOpen className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Open Saved Charts</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={exportChart}>
                <Download className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Export JSON</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleImport}>
                <Upload className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Import JSON</TooltipContent>
          </Tooltip>
        </ToolbarGroup>

        <ToolbarSeparator />

        {/* Theme toggle */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={toggleTheme}>
              {theme === 'dark' ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</TooltipContent>
        </Tooltip>

        {/* Help */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setHelpDialogOpen(true)}>
              <HelpCircle className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Help Guide</TooltipContent>
        </Tooltip>

        <SaveDialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen} />
        <AddRowDialog open={addRowDialogOpen} onOpenChange={setAddRowDialogOpen} />
        <HelpDialog open={helpDialogOpen} onOpenChange={setHelpDialogOpen} />
      </div>
    </TooltipProvider>
  );
}
