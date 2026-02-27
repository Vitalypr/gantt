import {
  Rows3,
  MousePointerClick,
  Diamond,
  Waypoints,
  Calendar,
  Save,
  Keyboard,
  Lightbulb,
  GanttChart,
  Plus,
  Pencil,
  Trash2,
  ArrowUpDown,
  Merge,
  Move,
  GripHorizontal,
  Palette,
  ArrowDownFromLine,
  WrapText,
  ToggleLeft,
  Circle,
  ZoomIn,
  FolderOpen,
  Download,
  Upload,
  Maximize2,
  Sun,
  Smartphone,
  Settings,
  type LucideIcon,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

type HelpDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex items-center rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground shadow-[0_1px_0_1px_rgba(0,0,0,0.04)]">
      {children}
    </kbd>
  );
}

function SectionBadge({ icon: Icon, color }: { icon: LucideIcon; color: string }) {
  return (
    <div
      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
      style={{ backgroundColor: color }}
    >
      <Icon className="h-3.5 w-3.5 text-white" strokeWidth={2.5} />
    </div>
  );
}

function SectionHeading({
  icon,
  color,
  title,
}: {
  icon: LucideIcon;
  color: string;
  title: string;
}) {
  return (
    <div className="flex items-center gap-2.5 mb-3">
      <SectionBadge icon={icon} color={color} />
      <h3 className="text-[13px] font-bold tracking-tight text-foreground">{title}</h3>
    </div>
  );
}

function HelpItem({
  icon: Icon,
  label,
  children,
}: {
  icon?: LucideIcon;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-2.5 py-1.5">
      <div className="flex h-5 w-5 shrink-0 items-center justify-center">
        {Icon && <Icon className="h-3.5 w-3.5 text-muted-foreground/60" />}
      </div>
      <div className="min-w-0">
        <span className="text-[12px] font-semibold text-foreground">{label}</span>
        <span className="text-[12px] text-muted-foreground"> &mdash; </span>
        <span className="text-[12px] leading-relaxed text-muted-foreground">{children}</span>
      </div>
    </div>
  );
}

function ShortcutRow({ keys, description }: { keys: React.ReactNode; description: string }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-[12px] text-muted-foreground">{description}</span>
      <div className="flex items-center gap-1">{keys}</div>
    </div>
  );
}

function Divider() {
  return <div className="my-4 border-t border-border/60" />;
}

export function HelpDialog({ open, onOpenChange }: HelpDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[640px] gap-0 p-0">
        <DialogHeader className="border-b border-border/60 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <GanttChart className="h-4 w-4 text-primary-foreground" strokeWidth={2.5} />
            </div>
            <div>
              <DialogTitle className="text-[15px] font-bold tracking-tight">
                Help Guide
              </DialogTitle>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Everything you need to know about the Gantt Chart app
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="overflow-y-auto px-6 py-5" style={{ maxHeight: 'calc(80vh - 80px)' }}>
          {/* Getting Started */}
          <div className="rounded-lg bg-primary/[0.04] border border-primary/10 px-4 py-3 mb-5">
            <p className="text-[12px] leading-relaxed text-muted-foreground">
              <span className="font-semibold text-foreground">High Level Gantt Chart</span> is an
              interactive project planning tool. Create rows for your work streams, drag to create
              activity bars, connect them with dependencies, and export your plan. Works on desktop
              and mobile (touch).
            </p>
          </div>

          {/* Rows */}
          <SectionHeading icon={Rows3} color="#6366f1" title="Rows" />
          <div className="ml-[38px] space-y-0.5">
            <HelpItem icon={Plus} label="Add Row">
              Click the <span className="font-semibold text-foreground">+ Row</span> button in the
              toolbar (desktop only), or right-click the sidebar and select <span className="font-semibold text-foreground">Add Row Below</span>.
            </HelpItem>
            <HelpItem icon={Pencil} label="Rename Row">
              Double-click (or double-tap) the row name in the sidebar, or right-click &rarr; <span className="font-semibold text-foreground">Rename</span>.
            </HelpItem>
            <HelpItem icon={Trash2} label="Delete Row">
              Right-click (or long-press) the row &rarr; <span className="font-semibold text-foreground">Delete Row</span>. This also removes all activities in that row.
            </HelpItem>
            <HelpItem icon={ArrowUpDown} label="Move Row">
              Right-click the row &rarr; <span className="font-semibold text-foreground">Move Up</span> or <span className="font-semibold text-foreground">Move Down</span>.
            </HelpItem>
            <HelpItem icon={Merge} label="Merge Rows">
              Right-click a row &rarr; <span className="font-semibold text-foreground">Merge with Below</span> to
              visually merge name cells. Unmerge via right-click &rarr; <span className="font-semibold text-foreground">Unmerge</span>.
            </HelpItem>
          </div>

          <Divider />

          {/* Activities */}
          <SectionHeading icon={MousePointerClick} color="#f59e0b" title="Activities" />
          <div className="ml-[38px] space-y-0.5">
            <HelpItem icon={GripHorizontal} label="Create Activity">
              Drag horizontally on an empty row area to create an activity spanning the dragged range.
              On touch devices, double-tap an empty cell to create a 1-month activity.
            </HelpItem>
            <HelpItem icon={Move} label="Move Activity">
              Drag an activity bar to reposition it along the timeline. Snaps to month grid.
            </HelpItem>
            <HelpItem icon={GripHorizontal} label="Resize Activity">
              Drag the left or right edge of an activity bar to change its start or duration.
            </HelpItem>
            <HelpItem icon={Pencil} label="Rename Activity">
              Double-click (or double-tap) on an activity bar, type the new name, and press <Kbd>Enter</Kbd>.
            </HelpItem>
            <HelpItem icon={Trash2} label="Delete Activity">
              Right-click (or long-press) the activity &rarr; <span className="font-semibold text-foreground">Delete</span>.
            </HelpItem>
            <HelpItem icon={Palette} label="Change Color">
              Right-click the activity &rarr; <span className="font-semibold text-foreground">Color</span> &rarr; pick from the palette.
            </HelpItem>
            <HelpItem icon={ArrowDownFromLine} label="Row Span">
              Drag the bottom edge of an activity bar downward to span 2 rows. Drag back up to
              collapse to a single row.
            </HelpItem>
            <HelpItem icon={WrapText} label="Text Wrapping">
              Long activity names automatically wrap to multiple lines within the bar.
            </HelpItem>
          </div>

          <Divider />

          {/* Milestones */}
          <SectionHeading icon={Diamond} color="#ec4899" title="Milestones" />
          <div className="ml-[38px] space-y-0.5">
            <HelpItem icon={Diamond} label="Convert to Milestone">
              Right-click an activity &rarr; <span className="font-semibold text-foreground">Convert to Milestone</span>. The bar
              becomes a diamond marker. Milestones scale with row height.
            </HelpItem>
            <HelpItem icon={GripHorizontal} label="Convert Back">
              Right-click a milestone &rarr; <span className="font-semibold text-foreground">Convert to Activity</span>.
            </HelpItem>
            <HelpItem icon={Move} label="Interact">
              Milestones can be moved by dragging and renamed by double-clicking (or double-tapping).
            </HelpItem>
          </div>

          <Divider />

          {/* Dependencies */}
          <SectionHeading icon={Waypoints} color="#10b981" title="Dependencies (Connections)" />
          <div className="ml-[38px] space-y-0.5">
            <HelpItem icon={ToggleLeft} label="Enter Connect Mode">
              Click the <span className="font-semibold text-foreground">Connect</span> button in the
              toolbar (icon-only on mobile). It turns blue when active.
            </HelpItem>
            <HelpItem icon={Circle} label="Create Dependency">
              In Connect mode, hover (or tap) an activity to see anchor dots on all 4 sides.
              Drag from any anchor dot to another activity&apos;s anchor dot.
            </HelpItem>
            <HelpItem icon={Trash2} label="Delete Dependency">
              Click on a dependency arrow to select it, then press <Kbd>Delete</Kbd>.
            </HelpItem>
            <div className="py-1.5 ml-[30px]">
              <p className="text-[11px] italic text-muted-foreground/70">
                Dependency arrows are only visible when Connect mode is active.
              </p>
            </div>
          </div>

          <Divider />

          {/* Timeline & View */}
          <SectionHeading icon={Calendar} color="#3b82f6" title="Timeline & View" />
          <div className="ml-[38px] space-y-0.5">
            <HelpItem icon={ZoomIn} label="Zoom In/Out">
              Use the <span className="font-semibold text-foreground">+</span> / <span className="font-semibold text-foreground">&minus;</span> buttons
              to adjust month column width. The zoom level is shown in pixels on desktop
              (e.g. <code className="rounded bg-muted px-1 text-[11px]">80px</code>).
              Zoom can go as low as 4px for a bird&apos;s-eye view.
            </HelpItem>
            <HelpItem icon={Maximize2} label="Fit Chart to View">
              Click the <span className="font-semibold text-foreground">expand</span> icon to auto-zoom
              so the entire chart (start to end date) fits in the visible area without scrolling.
            </HelpItem>
            <HelpItem icon={GripHorizontal} label="Date Range">
              Use the month and year dropdowns in the toolbar to set the chart&apos;s visible time
              range. Activities preserve their calendar position when the range changes.
            </HelpItem>
            <HelpItem icon={Rows3} label="Row Height">
              Click the <span className="font-semibold text-foreground">rows</span> icon to cycle
              through row sizes: <span className="font-semibold text-foreground">Small</span> (28px)
              &rarr; <span className="font-semibold text-foreground">Medium</span> (40px)
              &rarr; <span className="font-semibold text-foreground">Large</span> (56px).
              Activities, milestones, and grid all scale accordingly.
            </HelpItem>
            <HelpItem icon={Calendar} label="Quarter Row">
              Click the <span className="font-semibold text-foreground">Qr</span> button to show
              or hide the quarter tier (Q1/Q2/Q3/Q4) in the timeline header.
            </HelpItem>
            <HelpItem icon={Move} label="Scroll">
              Mouse scroll, trackpad, or touch drag to navigate the chart.
            </HelpItem>
            <div className="py-1.5 ml-[30px]">
              <p className="text-[11px] italic text-muted-foreground/70">
                A red dotted line marks the current date on the timeline.
              </p>
            </div>
          </div>

          <Divider />

          {/* Saving & Loading */}
          <SectionHeading icon={Save} color="#8b5cf6" title="Saving & Loading" />
          <div className="ml-[38px] space-y-0.5">
            <HelpItem icon={Save} label="Save">
              Click the floppy disk icon to save the chart to browser storage.
            </HelpItem>
            <HelpItem icon={FolderOpen} label="Open">
              Click the folder icon to browse and load previously saved charts.
            </HelpItem>
            <HelpItem icon={Download} label="Export JSON">
              Click the download icon to export the chart as a <code className="rounded bg-muted px-1 text-[11px]">.gantt.json</code> file.
              The export includes all view settings (sidebar width, zoom level, row size, quarter visibility).
            </HelpItem>
            <HelpItem icon={Upload} label="Import JSON">
              Click the upload icon to load a chart from a <code className="rounded bg-muted px-1 text-[11px]">.json</code> file.
              View settings are restored automatically if present.
            </HelpItem>
            <div className="py-1.5 ml-[30px]">
              <p className="text-[11px] italic text-muted-foreground/70">
                Charts are also automatically saved as you work, including view settings.
              </p>
            </div>
          </div>

          <Divider />

          {/* Display */}
          <SectionHeading icon={Settings} color="#06b6d4" title="Display Settings" />
          <div className="ml-[38px] space-y-0.5">
            <HelpItem icon={Sun} label="Dark / Light Mode">
              Click the <span className="font-semibold text-foreground">sun/moon</span> icon in the
              toolbar to toggle between dark and light themes.
            </HelpItem>
            <HelpItem icon={GripHorizontal} label="Resize Sidebar">
              Drag the vertical handle on the right edge of the sidebar to adjust its width.
              On touch devices, the handle is wider for easier targeting.
            </HelpItem>
            <HelpItem icon={Pencil} label="Edit Chart Name">
              Click the name field in the toolbar to rename your chart.
            </HelpItem>
          </div>

          <Divider />

          {/* Touch / Mobile */}
          <SectionHeading icon={Smartphone} color="#f43f5e" title="Touch & Mobile" />
          <div className="ml-[38px] space-y-0.5">
            <HelpItem icon={GripHorizontal} label="Create Activity">
              Double-tap on an empty cell to create a 1-month activity. Drag to create longer activities.
            </HelpItem>
            <HelpItem icon={Move} label="Move & Resize">
              Touch and drag activities to move them. Drag edges to resize.
              All drag interactions work with touch.
            </HelpItem>
            <HelpItem icon={Pencil} label="Rename">
              Double-tap an activity or row name to edit it.
            </HelpItem>
            <div className="py-1.5 ml-[30px]">
              <p className="text-[11px] italic text-muted-foreground/70">
                The app can be installed as a PWA from the browser menu for a native-like experience.
              </p>
            </div>
          </div>

          <Divider />

          {/* Keyboard Shortcuts */}
          <SectionHeading icon={Keyboard} color="#64748b" title="Keyboard Shortcuts" />
          <div className="ml-[38px] space-y-0.5">
            <ShortcutRow keys={<><Kbd>Ctrl</Kbd><span className="text-[10px] text-muted-foreground/50">+</span><Kbd>Z</Kbd></>} description="Undo" />
            <ShortcutRow keys={<><Kbd>Ctrl</Kbd><span className="text-[10px] text-muted-foreground/50">+</span><Kbd>Shift</Kbd><span className="text-[10px] text-muted-foreground/50">+</span><Kbd>Z</Kbd></>} description="Redo" />
            <ShortcutRow keys={<Kbd>Delete</Kbd>} description="Remove selected activity or dependency" />
            <ShortcutRow keys={<Kbd>Enter</Kbd>} description="Confirm rename" />
            <ShortcutRow keys={<Kbd>Escape</Kbd>} description="Cancel rename" />
          </div>

          <Divider />

          {/* Tips */}
          <SectionHeading icon={Lightbulb} color="#f97316" title="Tips" />
          <div className="ml-[38px] space-y-2">
            <div className="flex gap-2 items-start">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-muted-foreground/40" />
              <p className="text-[12px] leading-relaxed text-muted-foreground">
                <span className="font-semibold text-foreground">Duration label</span> &mdash; each
                activity bar shows its duration in the bottom-right corner (e.g.{' '}
                <code className="rounded bg-muted px-1 text-[11px]">3m</code>).
              </p>
            </div>
            <div className="flex gap-2 items-start">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-muted-foreground/40" />
              <p className="text-[12px] leading-relaxed text-muted-foreground">
                <span className="font-semibold text-foreground">Fit to view</span> &mdash; use the
                expand button to quickly see the entire chart, then zoom in on areas of interest.
              </p>
            </div>
            <div className="flex gap-2 items-start">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-muted-foreground/40" />
              <p className="text-[12px] leading-relaxed text-muted-foreground">
                <span className="font-semibold text-foreground">Portable export</span> &mdash; exported
                JSON files include all view settings, so the chart looks the same when imported on
                another device.
              </p>
            </div>
            <div className="flex gap-2 items-start">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-muted-foreground/40" />
              <p className="text-[12px] leading-relaxed text-muted-foreground">
                <span className="font-semibold text-foreground">Small row height</span> &mdash; use
                small rows with low zoom to fit large projects on a single screen for overview presentations.
              </p>
            </div>
          </div>

          <div className="mt-5 mb-1" />
        </div>
      </DialogContent>
    </Dialog>
  );
}
