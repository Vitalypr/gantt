import { describe, it, expect, beforeEach } from 'vitest';
import { useStore } from '@/stores';
import { parseViewSettings, DEFAULT_VIEW_SETTINGS, VIEW_SETTING_KEYS } from '@/utils/viewSettings';
import type { ViewSettings } from '@/types/gantt';

/**
 * View settings pass through three hands - capture, persist, parse - and a field missing
 * from any one of them is dropped SILENTLY on reload, with no error anywhere. These tests
 * fail the moment a new `ViewSettings` field is added without being carried end to end.
 */
describe('view settings round trip', () => {
  beforeEach(() => {
    useStore.getState().setTimelineMode('months');
  });

  it('captures every declared field', () => {
    const captured = useStore.getState().captureViewSettings();
    for (const key of VIEW_SETTING_KEYS) {
      expect(Object.prototype.hasOwnProperty.call(captured, key), `capture drops ${key}`).toBe(true);
    }
  });

  it('survives JSON persistence and parsing with every value intact', () => {
    const s = useStore.getState();
    s.setSidebarWidth(321);
    s.setMonthWidth(97);
    s.setWeekWidth(43);
    s.setRowSize('large');
    s.setShowQuarters(false);
    s.setTimelineMode('weeks');
    s.setChartDirection('rtl');
    s.setShowStatus(false);

    const captured = useStore.getState().captureViewSettings();
    const parsed = parseViewSettings(JSON.parse(JSON.stringify(captured)));

    expect(parsed).toEqual(captured);
  });

  it('restores every field back into the store', () => {
    const target: ViewSettings = {
      sidebarWidth: 199,
      monthWidth: 55,
      weekWidth: 33,
      rowSize: 'small',
      showQuarters: false,
      timelineMode: 'weeks',
      chartDirection: 'rtl',
      showStatus: false,
    };
    useStore.getState().restoreViewSettings(target);
    const s = useStore.getState();
    expect(s.sidebarWidth).toBe(199);
    expect(s.monthWidth).toBe(55);
    expect(s.weekWidth).toBe(33);
    expect(s.rowSize).toBe('small');
    expect(s.showQuarters).toBe(false);
    expect(s.timelineMode).toBe('weeks');
    expect(s.chartDirection).toBe('rtl');
    expect(s.showStatus).toBe(false);
  });

  it('the parser carries every declared key', () => {
    const parsed = parseViewSettings({}) as Record<string, unknown>;
    for (const key of VIEW_SETTING_KEYS) {
      expect(Object.prototype.hasOwnProperty.call(parsed, key), `parse drops ${key}`).toBe(true);
    }
  });

  it('rejects junk without throwing, falling back to defaults', () => {
    expect(parseViewSettings(null)).toBeUndefined();
    expect(parseViewSettings('nope')).toBeUndefined();
    const parsed = parseViewSettings({ sidebarWidth: 'wide', rowSize: 'enormous', showQuarters: 'yes' });
    expect(parsed!.sidebarWidth).toBe(DEFAULT_VIEW_SETTINGS.sidebarWidth);
    expect(parsed!.rowSize).toBe('medium');
    expect(parsed!.showQuarters).toBe(true);
  });

  it('ignores unknown keys rather than letting them reach state', () => {
    const parsed = parseViewSettings({ sidebarWidth: 200, evil: 'payload' }) as Record<string, unknown>;
    expect(parsed['evil']).toBeUndefined();
  });
});
