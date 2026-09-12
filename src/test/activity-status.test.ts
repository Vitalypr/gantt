import { describe, it, expect, beforeEach } from 'vitest';
import { useStore } from '@/stores';
import { normalizeChart } from '@/utils/persistence';
import { statusFillFraction, statusFromLegacyProgress } from '@/utils/activity';
import { railInk, withAlpha, contrastRatio, LABEL_DARK, LABEL_LIGHT } from '@/utils/color';
import {
  ROW_SIZE_MAP,
  STATUS_RAIL_BOTTOM,
  STATUS_RAIL_HEIGHT,
  STATUS_RAIL_RESERVE,
} from '@/constants/timeline';
import { ACTIVITY_STATUSES } from '@/types/gantt';
import { ALL_ACTIVITY_COLORS } from '@/constants/colors';
import type { MonthsChart } from '@/types/gantt';

describe('statusFillFraction', () => {
  it('runs empty, half, full', () => {
    expect(statusFillFraction('todo')).toBe(0);
    expect(statusFillFraction('doing')).toBe(0.5);
    expect(statusFillFraction('done')).toBe(1);
  });

  it('is distinguishable without colour — the fractions are all different', () => {
    const fractions = ACTIVITY_STATUSES.map(statusFillFraction);
    expect(new Set(fractions).size).toBe(ACTIVITY_STATUSES.length);
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
  it('reads against every palette swatch, light fills included', () => {
    for (const swatch of ALL_ACTIVITY_COLORS) {
      const ink = railInk(swatch);
      const base = ink.fill.startsWith('rgba(255') ? LABEL_LIGHT : LABEL_DARK;
      expect(contrastRatio(base, swatch), swatch).toBeGreaterThanOrEqual(3);
    }
  });

  it('flips ink with the fill rather than hardcoding one', () => {
    expect(railInk('#fef9c3').fill).toContain('15, 23, 42');
    expect(railInk('#1e3a8a').fill).toContain('255, 255, 255');
  });

  it('draws the track fainter than the fill', () => {
    const { track, fill } = railInk('#14b8a6');
    const alpha = (c: string) => Number(c.split(',').pop()!.replace(')', ''));
    expect(alpha(track)).toBeLessThan(alpha(fill));
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
