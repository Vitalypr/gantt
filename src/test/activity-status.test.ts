import { describe, it, expect, beforeEach } from 'vitest';
import { useStore } from '@/stores';
import { normalizeChart } from '@/utils/persistence';
import { statusDrawsRail, statusFillFraction, statusFromLegacyProgress } from '@/utils/activity';
import { railInk, withAlpha, contrastRatio, RAIL_INK_DARK, RAIL_INK_LIGHT } from '@/utils/color';
import {
  ROW_SIZE_MAP,
  STATUS_RAIL_BOTTOM,
  STATUS_RAIL_HEIGHT,
  STATUS_RAIL_RESERVE,
} from '@/constants/timeline';
import { ACTIVITY_STATUSES } from '@/types/gantt';
import { ALL_ACTIVITY_COLORS, DEFAULT_ACTIVITY_COLOR, LABEL_COLOR_CHOICES } from '@/constants/colors';
import type { MonthsChart } from '@/types/gantt';

describe('statusFillFraction', () => {
  it('runs empty, half, full', () => {
    expect(statusFillFraction('todo')).toBe(0);
    expect(statusFillFraction('doing')).toBe(0.5);
    expect(statusFillFraction('done')).toBe(1);
  });

  it('gives "not relevant" no rail — it is a hatch over the whole bar', () => {
    expect(statusFillFraction('na')).toBeNull();
    expect(statusDrawsRail('na')).toBe(false);
  });

  it('reserves label height only for the statuses drawn as a rail', () => {
    expect(statusDrawsRail(undefined)).toBe(false);
    expect(statusDrawsRail('todo')).toBe(true);
    expect(statusDrawsRail('doing')).toBe(true);
    expect(statusDrawsRail('done')).toBe(true);
  });

  it('is distinguishable without colour — every state draws differently', () => {
    const marks = ACTIVITY_STATUSES.map(statusFillFraction);
    expect(new Set(marks).size).toBe(ACTIVITY_STATUSES.length);
  });
});

/**
 * The rail is absolutely positioned and the bar reserves `STATUS_RAIL_RESERVE` as bottom
 * padding. That reserve is the whole contract: a label that wraps to two lines must stop
 * ABOVE the rail, never run under it.
 */
describe('two-line label clears the rail', () => {
  const BAR_INSET = 8; // bar height is calc(rowSpan * 100% - 8px)
  const LEADING = 1.25; // leading-tight

  /** Vertical box the centred label occupies inside a bar of `barHeight`. */
  const labelBox = (barHeight: number, lines: number, fontSize: number, reserve: number) => {
    const content = barHeight - reserve;
    const text = lines * fontSize * LEADING;
    const top = (content - text) / 2;
    return { top, bottom: top + text };
  };

  const railTop = (barHeight: number) => barHeight - STATUS_RAIL_BOTTOM - STATUS_RAIL_HEIGHT;

  it('reserves exactly the rail plus its gap, and no more', () => {
    expect(STATUS_RAIL_RESERVE).toBe(STATUS_RAIL_HEIGHT + STATUS_RAIL_BOTTOM);
  });

  it('keeps a two-line 10px label off the rail at the medium row height', () => {
    const barHeight = ROW_SIZE_MAP.medium - BAR_INSET;
    const box = labelBox(barHeight, 2, 10, STATUS_RAIL_RESERVE);
    expect(box.bottom).toBeLessThanOrEqual(railTop(barHeight));
  });

  it('keeps a two-line label off the rail at every row height it fits in', () => {
    for (const size of ['medium', 'large'] as const) {
      const barHeight = ROW_SIZE_MAP[size] - BAR_INSET;
      const box = labelBox(barHeight, 2, 10, STATUS_RAIL_RESERVE);
      expect(box.bottom, size + ' two-line label overlaps the rail')
        .toBeLessThanOrEqual(railTop(barHeight));
      expect(box.top, size + ' two-line label overflows the top').toBeGreaterThanOrEqual(0);
    }
  });

  it('would overlap without the reserve — which is why the reserve exists', () => {
    const barHeight = ROW_SIZE_MAP.medium - BAR_INSET;
    const unreserved = labelBox(barHeight, 2, 10, 0);
    expect(unreserved.bottom).toBeGreaterThan(railTop(barHeight));
  });

  it('costs an untracked bar nothing — the label sits lower without a rail', () => {
    const barHeight = ROW_SIZE_MAP.medium - BAR_INSET;
    const withRail = labelBox(barHeight, 2, 10, STATUS_RAIL_RESERVE);
    const without = labelBox(barHeight, 2, 10, 0);
    expect(without.top).toBeGreaterThan(withRail.top);
  });
});

describe('rail ink', () => {
  it('always picks whichever of the two greys actually scores higher', () => {
    for (const swatch of ALL_ACTIVITY_COLORS) {
      const chosen = railInk(swatch).ink;
      const other = chosen === RAIL_INK_LIGHT ? RAIL_INK_DARK : RAIL_INK_LIGHT;
      expect(contrastRatio(chosen, swatch), swatch)
        .toBeGreaterThanOrEqual(contrastRatio(other, swatch));
    }
  });

  it('is a grey pair, not the label ink — no near-black on a pale bar', () => {
    expect(railInk('#fef9c3').ink).toBe(RAIL_INK_DARK);
    expect(railInk('#1e3a8a').ink).toBe(RAIL_INK_LIGHT);
    expect(railInk('#14b8a6').ink).toBe(RAIL_INK_LIGHT);
  });

  /**
   * The chosen pair sits BELOW the 3:1 floor WCAG 1.4.11 asks of non-text UI. That is a
   * deliberate trade for a softer mark, and this pins it: a palette change that pushes the
   * worst case lower is a regression, not a new normal.
   */
  it('holds its measured worst case across the whole palette', () => {
    let worst = Infinity;
    let worstSwatch = '';
    for (const swatch of ALL_ACTIVITY_COLORS) {
      const c = contrastRatio(railInk(swatch).ink, swatch);
      if (c < worst) {
        worst = c;
        worstSwatch = swatch;
      }
    }
    expect(worst, `worst swatch ${worstSwatch}`).toBeGreaterThanOrEqual(1.9);
  });

  it('draws the empty track weaker than a filled one, but not faint', () => {
    const { track, fill, ink } = railInk('#14b8a6');
    const alpha = (c: string) => Number(c.split(',').pop()!.replace(')', ''));
    expect(alpha(track)).toBeGreaterThanOrEqual(0.4);
    expect(alpha(track)).toBeLessThan(1);
    expect(fill).toBe(ink);
  });

  it('gives the hatch its own weight, heavier than the track', () => {
    const { track, hatch } = railInk('#14b8a6');
    const alpha = (c: string) => Number(c.split(',').pop()!.replace(')', ''));
    expect(alpha(hatch)).toBeGreaterThan(alpha(track));
  });
});

describe('withAlpha', () => {
  it('expands 3-digit hex', () => {
    expect(withAlpha('#fff', 0.5)).toBe('rgba(255, 255, 255, 0.5)');
  });

  it('passes a non-hex through untouched rather than emitting rgba(NaN)', () => {
    expect(withAlpha('var(--x)', 0.5)).toBe('var(--x)');
  });
});

describe('legacy progress migration', () => {
  it('maps the old coarse steps onto the three states', () => {
    expect(statusFromLegacyProgress(0)).toBe('todo');
    expect(statusFromLegacyProgress(25)).toBe('doing');
    expect(statusFromLegacyProgress(50)).toBe('doing');
    expect(statusFromLegacyProgress(75)).toBe('doing');
    expect(statusFromLegacyProgress(100)).toBe('done');
  });

  it('leaves anything unusable untracked instead of inventing a state', () => {
    expect(statusFromLegacyProgress(undefined)).toBeNull();
    expect(statusFromLegacyProgress('50')).toBeNull();
    expect(statusFromLegacyProgress(Number.NaN)).toBeNull();
  });

  it('converts on the way in and drops the dead field', () => {
    const raw = {
      id: 'c', unit: 'month', name: 'T',
      startYear: 2026, startMonth: 1, endYear: 2026, endMonth: 12,
      rows: [{ id: 'r1', name: '', order: 0, activityIds: ['a1', 'a2', 'a3'] }],
      activities: [
        { id: 'a1', name: 'A', color: '#14b8a6', startMonth: 0, durationMonths: 2, order: 0, progress: 100 },
        { id: 'a2', name: 'B', color: '#14b8a6', startMonth: 2, durationMonths: 2, order: 1, progress: 25 },
        { id: 'a3', name: 'C', color: '#14b8a6', startMonth: 4, durationMonths: 2, order: 2 },
      ],
      dependencies: [], createdAt: 'x', updatedAt: 'x',
    } as unknown as MonthsChart;

    const out = normalizeChart(raw);
    expect(out.activities.map((a) => a.status)).toEqual(['done', 'doing', undefined]);

    for (const a of out.activities) {
      expect(a).not.toHaveProperty('progress');
    }
  });

  it('does not overwrite a status that is already set', () => {
    const raw = {
      id: 'c', unit: 'month', name: 'T',
      startYear: 2026, startMonth: 1, endYear: 2026, endMonth: 12,
      rows: [{ id: 'r1', name: '', order: 0, activityIds: ['a1'] }],
      activities: [
        { id: 'a1', name: 'A', color: '#14b8a6', startMonth: 0, durationMonths: 2, order: 0, status: 'todo', progress: 100 },
      ],
      dependencies: [], createdAt: 'x', updatedAt: 'x',
    } as unknown as MonthsChart;
    expect(normalizeChart(raw).activities[0]!.status).toBe('todo');
  });
});

describe('setting and clearing status', () => {
  const seed = (): MonthsChart => ({
    id: 'c', unit: 'month', name: 'T',
    startYear: 2026, startMonth: 1, endYear: 2026, endMonth: 12,
    rows: [{ id: 'r1', name: '', order: 0, activityIds: ['a1'] }],
    activities: [{ id: 'a1', name: 'A', color: '#14b8a6', startMonth: 0, durationMonths: 2, order: 0 }],
    dependencies: [], createdAt: 'x', updatedAt: 'x',
  });

  beforeEach(() => {
    useStore.getState().setChart(seed());
  });

  it('sets a status', () => {
    useStore.getState().updateActivity('a1', { status: 'doing' });
    expect(useStore.getState().chart.activities[0]!.status).toBe('doing');
  });

  it('clears back to not-relevant — the old guard swallowed this', () => {
    useStore.getState().updateActivity('a1', { status: 'done' });
    useStore.getState().updateActivity('a1', { status: undefined });
    expect(useStore.getState().chart.activities[0]!.status).toBeUndefined();
  });
});

describe('the global switch', () => {
  it('defaults to on and toggles', () => {
    expect(useStore.getState().showStatus).toBe(true);
    useStore.getState().setShowStatus(false);
    expect(useStore.getState().showStatus).toBe(false);
    useStore.getState().setShowStatus(true);
  });

  it('survives a view-settings round trip', () => {
    useStore.getState().setShowStatus(false);
    const captured = useStore.getState().captureViewSettings();
    expect(captured.showStatus).toBe(false);
    useStore.getState().setShowStatus(true);
    useStore.getState().restoreViewSettings(captured);
    expect(useStore.getState().showStatus).toBe(false);
    useStore.getState().setShowStatus(true);
  });
});

describe('status validation at ingress', () => {
  const chartWith = (status: unknown): MonthsChart => ({
    id: 'c', unit: 'month', name: 'T',
    startYear: 2026, startMonth: 1, endYear: 2026, endMonth: 12,
    rows: [{ id: 'r1', name: '', order: 0, activityIds: ['a1'] }],
    activities: [
      { id: 'a1', name: 'A', color: '#14b8a6', startMonth: 0, durationMonths: 2, order: 0, status },
    ],
    dependencies: [], createdAt: 'x', updatedAt: 'x',
  } as unknown as MonthsChart);

  it('keeps every known status', () => {
    for (const s of ACTIVITY_STATUSES) {
      expect(normalizeChart(chartWith(s)).activities[0]!.status).toBe(s);
    }
  });

  it('drops an unknown one rather than letting it reach the renderer', () => {
    expect(normalizeChart(chartWith('shipped')).activities[0]!.status).toBeUndefined();
    expect(normalizeChart(chartWith(42)).activities[0]!.status).toBeUndefined();
  });
});

describe('label colour', () => {
  const chartWith = (labelColor: unknown): MonthsChart => ({
    id: 'c', unit: 'month', name: 'T',
    startYear: 2026, startMonth: 1, endYear: 2026, endMonth: 12,
    rows: [{ id: 'r1', name: '', order: 0, activityIds: ['a1'] }],
    activities: [
      { id: 'a1', name: 'A', color: '#14b8a6', startMonth: 0, durationMonths: 2, order: 0, labelColor },
    ],
    dependencies: [], createdAt: 'x', updatedAt: 'x',
  } as unknown as MonthsChart);

  it('offers exactly white, black, red and grey', () => {
    expect(LABEL_COLOR_CHOICES.map((c) => c.label)).toEqual(['White', 'Black', 'Red', 'Grey']);
  });

  it('keeps every offered value through an ingress', () => {
    for (const choice of LABEL_COLOR_CHOICES) {
      expect(normalizeChart(chartWith(choice.value)).activities[0]!.labelColor).toBe(choice.value);
    }
  });

  it('drops anything else rather than letting it reach a style attribute', () => {
    expect(normalizeChart(chartWith('rebeccapurple')).activities[0]!.labelColor).toBeUndefined();
    expect(normalizeChart(chartWith(42)).activities[0]!.labelColor).toBeUndefined();
    expect(normalizeChart(chartWith(undefined)).activities[0]!.labelColor).toBeUndefined();
  });

  it('reads on the default bar colour', () => {
    for (const choice of LABEL_COLOR_CHOICES) {
      const ratio = contrastRatio(choice.value, DEFAULT_ACTIVITY_COLOR);
      expect(ratio, `${choice.label} scored ${ratio.toFixed(2)}:1 on the default fill`)
        .toBeGreaterThanOrEqual(1.5);
    }
  });

  it('can be set and cleared back to automatic', () => {
    useStore.getState().setChart(chartWith(undefined));
    useStore.getState().updateActivity('a1', { labelColor: '#ef4444' });
    expect(useStore.getState().chart.activities[0]!.labelColor).toBe('#ef4444');
    useStore.getState().updateActivity('a1', { labelColor: undefined });
    expect(useStore.getState().chart.activities[0]!.labelColor).toBeUndefined();
  });
});
