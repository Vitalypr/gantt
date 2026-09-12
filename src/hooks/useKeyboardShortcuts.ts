import { useEffect } from 'react';
import { useStore } from '@/stores';
import { useUndo, useRedo } from '@/stores/hooks';
import type { Activity } from '@/types/gantt';

/**
 * True while a Radix dialog, menu or popper is mounted and open.
 *
 * Those portals render outside the app tree, so the INPUT/TEXTAREA guard below does not
 * cover the case where the overlay itself has focus.
 */
function isOverlayOpen(): boolean {
  return document.querySelector(
    '[role="dialog"][data-state="open"], [role="menu"][data-state="open"], [data-radix-popper-content-wrapper]',
  ) !== null;
}

/**
 * In-app clipboard.
 *
 * Deliberately not the system clipboard: this app is offline-first, the system clipboard is
 * async and permission-gated, and copying a bar is a within-document operation. Module scope
 * rather than store state because it must NOT be part of undo history - Ctrl+Z should undo
 * the paste, not un-copy.
 */
let clipboard: Activity[] = [];

export function useKeyboardShortcuts() {
  const undo = useUndo();
  const redo = useRedo();

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Don't intercept when typing in inputs
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      const state = useStore.getState();
      const selection = state.selectedActivityIds;
      const mod = e.ctrlKey || e.metaKey;

      // Compare case-insensitively and branch on shiftKey. Matching 'z' for undo and 'Z'
      // for redo inverts the two under Caps Lock, because the OS reports the shifted glyph.
      const key = e.key.toLowerCase();

      if (mod && key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
        return;
      }

      if (mod && ((key === 'z' && e.shiftKey) || key === 'y')) {
        e.preventDefault();
        redo();
        return;
      }

      if (mod && key === 'f') {
        e.preventDefault();
        state.setFindQuery(state.findQuery === null ? '' : state.findQuery);
        return;
      }

      if (mod && key === 'a') {
        e.preventDefault();
        state.selectActivities(state._activeChart().activities.map((a) => a.id));
        return;
      }

      if (mod && key === 'd' && selection.length > 0) {
        e.preventDefault();
        // The copies land one unit later and become the selection, so a repeat of Ctrl+D
        // walks a run of bars across the chart.
        const ids = state.duplicateActivities(selection, 1);
        if (ids.length > 0) state.selectActivities(ids);
        return;
      }

      if (mod && key === 'c' && selection.length > 0) {
        e.preventDefault();
        const byId = new Map(state._activeChart().activities.map((a) => [a.id, a]));
        clipboard = selection.map((id) => byId.get(id)).filter((a): a is Activity => a != null);
        return;
      }

      if (mod && key === 'v' && clipboard.length > 0) {
        e.preventDefault();
        const targetRow = state._activeChart().rows.find((r) =>
          r.activityIds.includes(selection[0] ?? ''),
        );
        const ids = state.pasteActivities(clipboard, targetRow?.id);
        if (ids.length > 0) state.selectActivities(ids);
        return;
      }

      // Delete / Backspace → delete the selection or the selected dependency
      if (e.key === 'Delete' || e.key === 'Backspace') {
        // Radix dialogs and menus do not stop propagation, so without this the key deletes
        // the selection sitting behind an open modal.
        if (isOverlayOpen()) return;
        if (selection.length > 0) {
          e.preventDefault();
          // One commit for the whole selection, so a bulk delete is one Ctrl+Z.
          state.removeActivities(selection);
          state.selectActivity(null);
          return;
        }
        const depSelection = state.selectedDependency;
        if (depSelection) {
          e.preventDefault();
          state.removeDependency(depSelection.dependencyId);
          state.selectDependency(null);
        }
        return;
      }

      // Arrow keys: nudge, resize (Shift) or change row (Alt). All three go through ONE
      // compound action, so each press is exactly one undo entry.
      if (selection.length > 0 && e.key.startsWith('Arrow')) {
        if (isOverlayOpen()) return;
        const horizontal = e.key === 'ArrowLeft' || e.key === 'ArrowRight';
        // In RTL the axis is mirrored, so the arrow that means "later" flips with it.
        const isRtl = state.chartDirection === 'rtl';
        const sign = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : -1;
        const temporalSign = horizontal && isRtl ? -sign : sign;

        if (horizontal && e.shiftKey) {
          e.preventDefault();
          state.transformActivities(selection, { duration: temporalSign });
        } else if (horizontal) {
          e.preventDefault();
          state.transformActivities(selection, { units: temporalSign });
        } else if (e.altKey) {
          e.preventDefault();
          state.transformActivities(selection, { rows: sign });
        }
        return;
      }

      // Enter → rename the first selected bar.
      if (e.key === 'Enter' && selection.length > 0 && !isOverlayOpen()) {
        e.preventDefault();
        state.setEditingActivity({ activityId: selection[0]! });
        return;
      }

      // Escape → deselect / cancel editing
      if (e.key === 'Escape') {
        // The painter first: it is a mode, and Escape leaving it armed while clearing the
        // selection underneath would leave the pointer painting with nothing to show for it.
        if (state.formatPainter) {
          state.disarmFormatPainter();
        } else if (state.findQuery !== null) {
          state.setFindQuery(null);
        } else if (state.editingActivity) {
          state.setEditingActivity(null);
        } else if (state.selectedActivityIds.length > 0) {
          state.selectActivity(null);
        } else if (state.selectedDependency) {
          state.selectDependency(null);
        }
        return;
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);
}
