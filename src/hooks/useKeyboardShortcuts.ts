import { useEffect } from 'react';
import { useStore } from '@/stores';
import { useUndo, useRedo } from '@/stores/hooks';

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

      // Ctrl+Z / Cmd+Z → undo
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
        return;
      }

      // Ctrl+Shift+Z / Ctrl+Y → redo
      if ((e.ctrlKey || e.metaKey) && (e.key === 'Z' || e.key === 'y')) {
        e.preventDefault();
        redo();
        return;
      }

      // Delete / Backspace → delete selected activity or dependency
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const state = useStore.getState();
        const selection = state.selectedActivity;
        if (selection) {
          e.preventDefault();
          state.removeActivity(selection.activityId);
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

      // Escape → deselect / cancel editing
      if (e.key === 'Escape') {
        const state = useStore.getState();
        if (state.editingActivity) {
          state.setEditingActivity(null);
        } else if (state.selectedActivity) {
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
