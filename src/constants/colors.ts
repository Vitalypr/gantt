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
    name: 'Sky',
    colors: ['#e0f2fe', '#7dd3fc', '#0ea5e9', '#0369a1'],
  },
  {
    name: 'Emerald',
    colors: ['#d1fae5', '#6ee7b7', '#10b981', '#047857'],
  },
  {
    name: 'Lime',
    colors: ['#ecfccb', '#bef264', '#84cc16', '#4d7c0f'],
  },
  {
    name: 'Yellow',
    colors: ['#fef9c3', '#fde047', '#eab308', '#a16207'],
  },
  {
    name: 'Purple',
    colors: ['#f3e8ff', '#d8b4fe', '#a855f7', '#7e22ce'],
  },
  {
    name: 'Fuchsia',
    colors: ['#fae8ff', '#f0abfc', '#d946ef', '#a21caf'],
  },
  {
    name: 'Rose',
    colors: ['#ffe4e6', '#fda4af', '#f43f5e', '#be123c'],
  },
  {
    name: 'Slate',
    colors: ['#f1f5f9', '#cbd5e1', '#64748b', '#334155'],
  },
  {
    name: 'Stone',
    colors: ['#f5f5f4', '#d6d3d1', '#78716c', '#44403c'],
  },
  {
    name: 'Gray',
    colors: ['#f3f4f6', '#d1d5db', '#6b7280', '#374151'],
  },
] as const;

/** Every swatch, flattened — used by the frame-colour picker and by tests. */
export const ALL_ACTIVITY_COLORS: readonly string[] = ACTIVITY_COLOR_GROUPS.flatMap(
  (g) => g.colors,
);

/**
 * Teal, not blue.
 *
 * The chrome accent is indigo-500 (`--color-primary`), and a blue-500 default put content a
 * near-miss away from it in every screenshot. Teal is unambiguously a different hue while
 * still reading as content rather than UI.
 */
export const DEFAULT_ACTIVITY_COLOR = '#14b8a6';
