import { useRef, useState } from 'react';
import { useStore } from '@/stores';

type ActivityNameInputProps = {
  activityId: string;
  name: string;
  color: string;
  fontSize: number;
};

/**
 * Inline rename field, mounted ONLY while the activity is being edited.
 *
 * That is the whole design: because it mounts fresh per edit, its initial value comes from
 * props via `useState(name)` and it focuses through `autoFocus`. The previous shape kept a
 * permanently-mounted input and re-seeded it from an effect when `isEditing` flipped, which
 * is a `set-state-in-effect` cascade — and it also made Escape commit instead of cancel,
 * because the committed-flag and the value were reset a render late.
 */
export function ActivityNameInput({ activityId, name, color, fontSize }: ActivityNameInputProps) {
  const updateActivity = useStore((s) => s.updateActivity);
  const setEditingActivity = useStore((s) => s.setEditingActivity);

  const [value, setValue] = useState(name);
  const settledRef = useRef(false);

  const finish = (save: boolean) => {
    if (settledRef.current) return;
    settledRef.current = true;
    const trimmed = value.trim();
    // Only write a real change, so a rename that changed nothing costs no undo entry.
    if (save && trimmed && trimmed !== name) {
      updateActivity(activityId, { name: trimmed });
    }
    setEditingActivity(null);
  };

  return (
    <input
      autoFocus
      dir="auto"
      aria-label="Activity name"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onFocus={(e) => e.currentTarget.select()}
      onBlur={() => finish(true)}
      onPointerDown={(e) => e.stopPropagation()}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === 'Enter') {
          e.preventDefault();
          finish(true);
        } else if (e.key === 'Escape') {
          e.preventDefault();
          finish(false);
        }
      }}
      className="w-full bg-transparent text-center font-medium outline-none"
      style={{ color, fontSize }}
    />
  );
}
