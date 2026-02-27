export const ANCHOR_SIDES = ['left', 'right', 'top', 'bottom'] as const;
export type AnchorSide = (typeof ANCHOR_SIDES)[number];

export type Dependency = {
  id: string;
  fromActivityId: string;
  toActivityId: string;
  fromSide: AnchorSide;
  toSide: AnchorSide;
};

export type Activity = {
  id: string;
  name: string;
  color: string;
  startMonth: number;
  durationMonths: number;
  order: number;
  isMilestone?: boolean;
  rowSpan?: number;
  annotation?: string;
};

export type GanttRow = {
  id: string;
  name: string;
  order: number;
  activityIds: string[];
  /** If true, this row's name cell is merged with the next row below */
  mergedWithNext?: boolean;
};

export type ViewSettings = {
  sidebarWidth: number;
  monthWidth: number;
  rowSize: 'small' | 'medium' | 'large';
  showQuarters: boolean;
};

export type GanttChart = {
  id: string;
  name: string;
  startYear: number;
  startMonth: number; // 1-12
  endYear: number;
  endMonth: number;   // 1-12
  rows: GanttRow[];
  activities: Activity[];
  dependencies: Dependency[];
  viewSettings?: ViewSettings;
  createdAt: string;
  updatedAt: string;
};

export type SavedChartEntry = {
  id: string;
  name: string;
  updatedAt: string;
};
