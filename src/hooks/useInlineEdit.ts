import { useRef, useState, useEffect } from 'react';
import { useStore } from '@/stores';

/**
 * Manages inline text editing for activities and milestones.
 * Handles focus, commit-on-blur, Enter/Escape key behavior.
 */
export function useInlineEdit(activityId: string, activityName: string, isEditing: boolean) {
  const updateActivity = useStore((s) => s.updateActivity);
  const setEditingActivity = useStore((s) => s.setEditingActivity);

  const inputRef = useRef<HTMLInputElement>(null);
  const committedRef = useRef(false);
  const [editValue, setEditValue] = useState(activityName);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      committedRef.current = false;
      setEditValue(activityName);
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing, activityName]);

  const commitEdit = () => {
    if (committedRef.current) return;
    committedRef.current = true;
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== activityName) {
      updateActivity(activityId, { name: trimmed });
    }
    setEditingActivity(null);
  };

  const handleEditKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      commitEdit();
    } else if (e.key === 'Escape') {
      committedRef.current = true;
      setEditingActivity(null);
    }
  };

  return { inputRef, editValue, setEditValue, commitEdit, handleEditKeyDown };
}
