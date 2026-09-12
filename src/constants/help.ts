/**
 * Help content as DATA, not 300 lines of hand-written JSX.
 *
 * The previous version was prose embedded in the component, and it had already drifted:
 * it described save behaviour the app no longer had and claimed PWA installability while
 * the manifest icons 404'd. A manifest keeps the content in one reviewable list, and
 * `help.test.ts` asserts it stays internally consistent.
 */
export type HelpItem = { label: string; body: string };
export type HelpSection = { id: string; title: string; icon: string; color: string; items: HelpItem[] };
export type Shortcut = { keys: string[]; description: string };

export const HELP_SECTIONS: HelpSection[] = [
  {
    id: "rows",
    title: "Rows",
    icon: "Rows3",
    color: "#6366f1",
    items: [
      { label: "Add a row", body: "Double-click the empty space below the last row in the sidebar, or use Row in the toolbar. There is always a row-height of empty space there to aim at." },
      { label: "Rename", body: "Double-click a row name. Hebrew, English and mixed text all read in the right direction automatically." },
      { label: "Reorder and delete", body: "Right-click a row for Move Up / Move Down / Delete." },
      { label: "Merge name cells", body: "Right-click a row and choose Merge with Below. This is cosmetic only - it joins the name cells and does not group the bars." },
      { label: "Topics", body: "The tags button in the toolbar shows the narrow sideways column at the edge of the chart. A thin band of empty canvas separates one topic from the next, and the row names underneath always stay separate cells." },
      { label: "Several rows under one topic", body: "Drag down the + slots to sweep the rows you want, and they become one topic in a single gesture. To change it afterwards, drag the bottom edge of the topic cell: down to take in more rows, up to give them back. Each drag is one undo." },
      { label: "Name a topic", body: "Double-click the sideways cell. It turns horizontal while you type, because a caret in rotated text is unusable. Right-click a row and choose Clear Topic to remove it." },
      { label: "Width of the names column", body: "Drag the divider at the edge of the names column - it carries a three-dot grip. The timeline columns re-divide whatever space is left and stay equal to each other. Click the grip and use the arrow keys to nudge it, Shift for larger steps." },
      { label: "A new chart", body: "Starts with twelve empty rows, so there is a sheet to fill rather than a single line." },
    ],
  },
  {
    id: "bars",
    title: "Bars and milestones",
    icon: "MousePointerClick",
    color: "#14b8a6",
    items: [
      { label: "Create", body: "Double-click an empty row, or drag across it to set the span in one gesture." },
      { label: "Move", body: "Drag a bar. Dragging vertically moves it to another row; position and row commit together, so it costs one undo." },
      { label: "Resize", body: "Drag the left or right edge. In right-to-left mode the edges still control the dates they look like they control." },
      { label: "Span rows", body: "Drag the thin top or bottom edge of a bar to make it cover several rows." },
      { label: "Milestone", body: "Right-click a bar and choose Convert to Milestone. A milestone is a one-unit bar with a heavy gold frame, so it occupies exactly the space a one-unit activity would while reading as a different kind of mark. Set a Frame colour to override the gold." },
      { label: "Colour", body: "Right-click and choose Colour. One palette laid out as a grid - a row per hue, a column per tone from 100 to 900 - with Fill, Frame and Text tabs above it. The dot on each tab shows what that tab currently holds." },
      { label: "Text colour", body: "The Text tab offers four: white, black, red and grey. Automatic is the default and picks black or white by measuring which one actually reads on that bar's fill, so leave it there unless you want a specific colour." },
      { label: "Font size", body: "Right-click for Font Size. The toolbar A- / A+ buttons resize the labels of everything selected." },
      { label: "Status", body: "Right-click and pick Status. No status leaves the bar as it is; Not relevant hatches the whole bar in diagonal grey; Not started, In progress and Done draw a grey rail inside the bottom edge - empty, half, full. Milestones take a status too." },
      { label: "Hide every status", body: "The target button in the toolbar shows or hides all the status marks at once, so a plan can be reviewed with delivery state on and exported without it." },
      { label: "Annotation", body: "Right-click and choose Add Annotation. Enter saves, Escape discards." },
    ],
  },
  {
    id: "selection",
    title: "Selection and editing",
    icon: "Move",
    color: "#f59e0b",
    items: [
      { label: "Multi-select", body: "Ctrl-click (or Shift-click) bars to build a selection. Colour, font size and deletion then apply to all of them in a single undo step." },
      { label: "Keyboard", body: "Arrows nudge the selection, Shift+arrows resize, Alt+arrows move it between rows. Each press is one undo entry." },
      { label: "Duplicate", body: "Ctrl+D copies the selection one unit later. Ctrl+C and Ctrl+V copy between rows." },
      { label: "Find", body: "Ctrl+F searches activity and row names - including Hebrew - and jumps to a match." },
    ],
  },
  {
    id: "timeline",
    title: "Timeline",
    icon: "Calendar",
    color: "#0ea5e9",
    items: [
      { label: "Months or weeks", body: "Mo / Wk switch between two independent charts. Each keeps its own rows, bars and zoom." },
      { label: "Right-to-left", body: "The direction button mirrors the whole chart: the earliest date moves to the right edge, the sidebar moves to the right, and month names switch to Hebrew." },
      { label: "Zoom", body: "Ctrl + mouse wheel zooms around the pointer; the toolbar buttons zoom around the centre. Fit to View sizes the chart to the window." },
      { label: "Holidays", body: "Israeli public holidays - the actual days off - are shaded in red, sized in proportion to their real length." },
      { label: "Markers", body: "Named vertical lines for deadlines and gates. They are stored as real dates, so they hold their place when the chart range changes." },
    ],
  },
  {
    id: "dependencies",
    title: "Dependencies",
    icon: "Waypoints",
    color: "#8b5cf6",
    items: [
      { label: "Draw an arrow", body: "Turn on Connect, then drag from a dot on one bar to a dot on another." },
      { label: "They are decoration", body: "Arrows are drawn geometry, not constraints. Nothing reschedules when a bar moves - that is deliberate." },
      { label: "Delete", body: "Click an arrow to select it and press Delete, or right-click it." },
    ],
  },
  {
    id: "saving",
    title: "Saving and export",
    icon: "Save",
    color: "#22c55e",
    items: [
      { label: "Autosave", body: "Your work is saved to this browser automatically, and restored when you return. If storage is full the app says so rather than failing quietly." },
      { label: "Named saves", body: "Save stores the chart you are currently editing - months or weeks - under its name. Open lists them; deleting one asks for confirmation because it cannot be undone." },
      { label: "JSON", body: "Export writes a .gantt.json file; Import reads one back. Imported files are checked and repaired before they reach the chart." },
      { label: "Images", body: "Snapshot (JPEG) copies to the clipboard and downloads. Snapshot (SVG) stays sharp at any size. Both use the current theme background." },
      { label: "Print / PDF", body: "Print lays the chart out in landscape and hides the toolbar. Use your browser Save as PDF." },
      { label: "Templates", body: "Start from a template fills a chart with a starting shape." },
    ],
  },
];

export const HELP_SHORTCUTS: Shortcut[] = [
  { keys: ["Ctrl", "Z"], description: "Undo" },
  { keys: ["Ctrl", "Shift", "Z"], description: "Redo" },
  { keys: ["Ctrl", "A"], description: "Select all bars" },
  { keys: ["Ctrl", "D"], description: "Duplicate the selection" },
  { keys: ["Ctrl", "C"], description: "Copy the selection" },
  { keys: ["Ctrl", "V"], description: "Paste" },
  { keys: ["Ctrl", "F"], description: "Find an activity" },
  { keys: ["Delete"], description: "Delete the selection" },
  { keys: ["Enter"], description: "Rename the selected bar" },
  { keys: ["\u2190", "\u2192"], description: "Move the selection in time" },
  { keys: ["Shift", "\u2190", "\u2192"], description: "Resize the selection" },
  { keys: ["Alt", "\u2191", "\u2193"], description: "Move the selection between rows" },
  { keys: ["Escape"], description: "Cancel editing or clear the selection" },
  { keys: ["Ctrl", "wheel"], description: "Zoom around the pointer" },
];
