// Colors organized by tone groups for the color picker
export const ACTIVITY_COLOR_GROUPS = [
  {
    name: 'Blue',
    colors: ['#dbeafe', '#93c5fd', '#3b82f6', '#1d4ed8'],
  },
  {
    name: 'Indigo',
    colors: ['#e0e7ff', '#a5b4fc', '#6366f1', '#4338ca'],
  },
  {
    name: 'Violet',
    colors: ['#ede9fe', '#c4b5fd', '#8b5cf6', '#6d28d9'],
  },
  {
    name: 'Pink',
    colors: ['#fce7f3', '#f9a8d4', '#ec4899', '#be185d'],
  },
  {
    name: 'Red',
    colors: ['#fee2e2', '#fca5a5', '#ef4444', '#b91c1c'],
  },
  {
    name: 'Orange',
    colors: ['#ffedd5', '#fdba74', '#f97316', '#c2410c'],
  },
  {
    name: 'Amber',
    colors: ['#fef3c7', '#fcd34d', '#f59e0b', '#b45309'],
  },
  {
    name: 'Green',
    colors: ['#dcfce7', '#86efac', '#22c55e', '#15803d'],
  },
  {
    name: 'Teal',
    colors: ['#ccfbf1', '#5eead4', '#14b8a6', '#0f766e'],
  },
  {
    name: 'Cyan',
    colors: ['#cffafe', '#67e8f9', '#06b6d4', '#0e7490'],
  },
  {
    name: 'Gray',
    colors: ['#f3f4f6', '#d1d5db', '#6b7280', '#374151'],
  },
] as const;

// Flat list for backward compat / defaults
export const ACTIVITY_COLORS = ACTIVITY_COLOR_GROUPS.flatMap((g) => g.colors);

export const DEFAULT_ACTIVITY_COLOR = '#3b82f6';
