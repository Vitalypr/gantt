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
  CalendarDays,
  FolderOpen,
  GanttChart as GanttIcon,
  Waypoints,
  HelpCircle,
  Sun,
  Moon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useStore } from '@/stores';
import { useUndo, useRedo } from '@/stores/hooks';
import { MIN_MONTH_WIDTH, MAX_MONTH_WIDTH } from '@/constants/timeline';
import { MONTH_NAMES_SHORT } from '@/constants/timeline';
import { getCurrentMonthIndex } from '@/utils/timeline';
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
  const chartName = useStore((s) => s.chart.name);
  const setChartName = useStore((s) => s.setChartName);
  const monthWidth = useStore((s) => s.monthWidth);
  const effectiveMonthWidth = useStore((s) => s.effectiveMonthWidth);
  const zoomIn = useStore((s) => s.zoomIn);
  const zoomOut = useStore((s) => s.zoomOut);
  const saveCurrentChart = useStore((s) => s.saveCurrentChart);
  const exportChart = useStore((s) => s.exportChart);
  const importChart = useStore((s) => s.importChart);
  const startYear = useStore((s) => s.chart.startYear);
  const startMonth = useStore((s) => s.chart.startMonth);
  const endYear = useStore((s) => s.chart.endYear);
  const endMonth = useStore((s) => s.chart.endMonth);
  const setDateRange = useStore((s) => s.setDateRange);
  const dependencyMode = useStore((s) => s.dependencyMode);
  const setDependencyMode = useStore((s) => s.setDependencyMode);

  const undo = useUndo();
  const redo = useRedo();

  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [addRowDialogOpen, setAddRowDialogOpen] = useState(false);
  const [helpDialogOpen, setHelpDialogOpen] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const { theme, toggleTheme } = useTheme();

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

  const scrollToToday = () => {
    const todayIndex = getCurrentMonthIndex(startYear, startMonth);
    const scrollContainer = document.querySelector('[data-gantt-scroll]');
    if (scrollContainer) {
      const sw = useStore.getState().sidebarWidth;
      const mw = useStore.getState().effectiveMonthWidth;
      const targetX = todayIndex * mw - scrollContainer.clientWidth / 2 + sw;
      scrollContainer.scrollTo({ left: Math.max(0, targetX), behavior: 'smooth' });
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
      // Ensure start doesn't go past end
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
      <div className="flex h-11 shrink-0 items-center border-b border-border/60 bg-surface px-3">
        {/* Brand + Chart name */}
        <div className="flex items-center gap-2.5 mr-1">
          <div className="flex items-center gap-1.5 text-primary">
            <GanttIcon className="h-4 w-4" strokeWidth={2.5} />
            <span className="text-[11px] font-bold tracking-wide uppercase text-primary/70 hidden sm:inline">High Level Gantt Chart</span>
            <span className="text-[11px] font-bold tracking-wide uppercase text-primary/70 sm:hidden">Gantt</span>
          </div>
          <div className="h-4 w-px bg-border" />
          <Input
            ref={nameInputRef}
            defaultValue={chartName}
            key={chartName}
            onBlur={handleNameBlur}
            onKeyDown={handleNameKeyDown}
            className="h-7 w-52 border-transparent bg-transparent px-1.5 text-[13px] font-semibold tracking-tight text-foreground hover:bg-muted focus:bg-muted focus:border-transparent"
          />
        </div>

        <ToolbarSeparator />

        {/* Add Row */}
        <ToolbarGroup>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 gap-1.5 px-2.5 text-xs font-medium"
                onClick={() => setAddRowDialogOpen(true)}
              >
                <Plus className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Row</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Add Row</TooltipContent>
          </Tooltip>
        </ToolbarGroup>

        <ToolbarSeparator />

        {/* Date range controls */}
        <ToolbarGroup>
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
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
        </ToolbarGroup>

        <ToolbarSeparator />

        {/* Zoom controls */}
        <ToolbarGroup>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={zoomOut} disabled={monthWidth <= MIN_MONTH_WIDTH}>
                <ZoomOut className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Zoom Out</TooltipContent>
          </Tooltip>

          <span className="min-w-[2.5rem] text-center text-[10px] font-medium tabular-nums text-muted-foreground/70">
            {Math.round(effectiveMonthWidth)}px
          </span>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={zoomIn} disabled={monthWidth >= MAX_MONTH_WIDTH}>
                <ZoomIn className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Zoom In</TooltipContent>
          </Tooltip>
        </ToolbarGroup>

        <ToolbarSeparator />

        {/* Today button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={scrollToToday}>
              <CalendarDays className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Scroll to Today</TooltipContent>
        </Tooltip>

        <ToolbarSeparator />

        {/* Dependency mode toggle */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={dependencyMode ? 'default' : 'ghost'}
              size="sm"
              className="h-7 gap-1.5 px-2.5 text-xs font-medium"
              onClick={() => setDependencyMode(!dependencyMode)}
            >
              <Waypoints className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Connect</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Toggle Dependency Mode</TooltipContent>
        </Tooltip>

        <div className="flex-1" />

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
