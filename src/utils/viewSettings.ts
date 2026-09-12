import type { ViewSettings } from '@/types/gantt';

export const DEFAULT_VIEW_SETTINGS: ViewSettings = {
  sidebarWidth: 240,
  monthWidth: 80,
  weekWidth: undefined,
  rowSize: 'medium',
  showQuarters: true,
  timelineMode: undefined,
  chartDirection: undefined,
  showStatus: undefined,
};

/**
 * Every key of ViewSettings. Exported because the round-trip test iterates it, so capture,
 * persist and parse are all checked against ONE list rather than three hand-kept ones.
 */
export const VIEW_SETTING_KEYS = [
  'sidebarWidth',
  'monthWidth',
  'weekWidth',
  'rowSize',
  'showQuarters',
  'timelineMode',
  'chartDirection',
  'showStatus',
] as const satisfies readonly (keyof ViewSettings)[];

// If a field is added to ViewSettings and NOT to the list above, this line stops compiling.
type _AllKeysListed = Exclude<keyof ViewSettings, (typeof VIEW_SETTING_KEYS)[number]> extends never
  ? true
  : ['ViewSettings key missing from VIEW_SETTING_KEYS'];
const _allKeysListed: _AllKeysListed = true;
void _allKeysListed;

const ROW_SIZES = ['small', 'medium', 'large'] as const;

/**
 * Parse persisted view settings.
 *
 * THE one place untrusted view settings become typed ones. This used to be a hand-written
 * object literal inside `migrateChart`, which meant every new `ViewSettings` field had to be
 * remembered in three places - and the one that was forgotten was silently dropped on every
 * reload, with no error anywhere. Now the compiler enforces the key list and
 * `view-settings.test.ts` asserts the round trip.
 */
export function parseViewSettings(raw: unknown): ViewSettings | undefined {
  if (typeof raw !== 'object' || raw === null) return undefined;
  const v = raw as Record<string, unknown>;

  const num = (key: string, fallback: number | undefined) =>
    typeof v[key] === 'number' && Number.isFinite(v[key]) ? (v[key] as number) : fallback;
  const bool = (key: string, fallback: boolean | undefined) =>
    typeof v[key] === 'boolean' ? (v[key] as boolean) : fallback;

  return {
    sidebarWidth: num('sidebarWidth', DEFAULT_VIEW_SETTINGS.sidebarWidth)!,
    monthWidth: num('monthWidth', DEFAULT_VIEW_SETTINGS.monthWidth)!,
    weekWidth: num('weekWidth', undefined),
    rowSize: ROW_SIZES.includes(v['rowSize'] as (typeof ROW_SIZES)[number])
      ? (v['rowSize'] as ViewSettings['rowSize'])
      : DEFAULT_VIEW_SETTINGS.rowSize,
    showQuarters: bool('showQuarters', DEFAULT_VIEW_SETTINGS.showQuarters)!,
    timelineMode: v['timelineMode'] === 'weeks' ? 'weeks' : v['timelineMode'] === 'months' ? 'months' : undefined,
    chartDirection: v['chartDirection'] === 'rtl' ? 'rtl' : v['chartDirection'] === 'ltr' ? 'ltr' : undefined,
    showStatus: bool('showStatus', undefined),
  };
}
