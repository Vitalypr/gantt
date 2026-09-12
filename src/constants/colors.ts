/**
 * The activity palette, as a matrix: one row per hue, one column per tone.
 *
 * Tones are Tailwind stops, so every colour in a row is the same hue at a different
 * lightness and the columns line up across rows. That alignment is the point — the picker
 * renders this structure directly, and a row whose entries were not the same stops would
 * put unrelated lightnesses under one column heading.
 *
 * 100/300/500/700 are the four the palette shipped with; 900 was added and the others were
 * left untouched, so every colour in an existing saved chart is still in the palette and
 * still highlights as the current swatch.
 */
export const COLOR_TONES = [100, 300, 500, 700, 900] as const;

export type ColorTone = (typeof COLOR_TONES)[number];

/** Index of the 500 column — the one a single representative swatch should come from. */
export const BASE_TONE_INDEX = COLOR_TONES.indexOf(500);

export const ACTIVITY_COLOR_GROUPS = [
  { name: 'Red', colors: ['#fee2e2', '#fca5a5', '#ef4444', '#b91c1c', '#7f1d1d'] },
  { name: 'Orange', colors: ['#ffedd5', '#fdba74', '#f97316', '#c2410c', '#7c2d12'] },
  { name: 'Amber', colors: ['#fef3c7', '#fcd34d', '#f59e0b', '#b45309', '#78350f'] },
  { name: 'Yellow', colors: ['#fef9c3', '#fde047', '#eab308', '#a16207', '#713f12'] },
  { name: 'Lime', colors: ['#ecfccb', '#bef264', '#84cc16', '#4d7c0f', '#365314'] },
  { name: 'Green', colors: ['#dcfce7', '#86efac', '#22c55e', '#15803d', '#14532d'] },
  { name: 'Emerald', colors: ['#d1fae5', '#6ee7b7', '#10b981', '#047857', '#064e3b'] },
  { name: 'Teal', colors: ['#ccfbf1', '#5eead4', '#14b8a6', '#0f766e', '#134e4a'] },
  { name: 'Cyan', colors: ['#cffafe', '#67e8f9', '#06b6d4', '#0e7490', '#164e63'] },
  { name: 'Sky', colors: ['#e0f2fe', '#7dd3fc', '#0ea5e9', '#0369a1', '#0c4a6e'] },
  { name: 'Blue', colors: ['#dbeafe', '#93c5fd', '#3b82f6', '#1d4ed8', '#1e3a8a'] },
  { name: 'Indigo', colors: ['#e0e7ff', '#a5b4fc', '#6366f1', '#4338ca', '#312e81'] },
  { name: 'Violet', colors: ['#ede9fe', '#c4b5fd', '#8b5cf6', '#6d28d9', '#4c1d95'] },
  { name: 'Purple', colors: ['#f3e8ff', '#d8b4fe', '#a855f7', '#7e22ce', '#581c87'] },
  { name: 'Fuchsia', colors: ['#fae8ff', '#f0abfc', '#d946ef', '#a21caf', '#701a75'] },
  { name: 'Pink', colors: ['#fce7f3', '#f9a8d4', '#ec4899', '#be185d', '#831843'] },
  { name: 'Rose', colors: ['#ffe4e6', '#fda4af', '#f43f5e', '#be123c', '#881337'] },
  { name: 'Slate', colors: ['#f1f5f9', '#cbd5e1', '#64748b', '#334155', '#0f172a'] },
  { name: 'Gray', colors: ['#f3f4f6', '#d1d5db', '#6b7280', '#374151', '#111827'] },
  { name: 'Stone', colors: ['#f5f5f4', '#d6d3d1', '#78716c', '#44403c', '#1c1917'] },
] as const satisfies readonly { name: string; colors: readonly string[] }[];

// A row that is short or long silently misaligns the picker's columns from its headings.
type _RowsMatchTones = typeof ACTIVITY_COLOR_GROUPS[number]['colors']['length'] extends
  typeof COLOR_TONES['length']
  ? true
  : ['a palette row does not have one entry per tone'];
const _rowsMatchTones: _RowsMatchTones = true;
void _rowsMatchTones;

/** Every swatch, flattened — used by tests. */
export const ALL_ACTIVITY_COLORS: readonly string[] = ACTIVITY_COLOR_GROUPS.flatMap(
  (g) => g.colors,
);

/** One representative swatch per hue, for pickers that offer a single row. */
export const BASE_TONE_COLORS: readonly string[] = ACTIVITY_COLOR_GROUPS.map(
  (g) => g.colors[BASE_TONE_INDEX]!,
);

/**
 * Teal, not blue.
 *
 * The chrome accent is indigo-500 (`--color-primary`), and a blue-500 default put content a
 * near-miss away from it in every screenshot. Teal is unambiguously a different hue while
 * still reading as content rather than UI.
 */
export const DEFAULT_ACTIVITY_COLOR = '#14b8a6';
