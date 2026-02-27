import { useCallback, useRef } from 'react';
import { useStore } from '@/stores';
import { MIN_SIDEBAR_WIDTH, MAX_SIDEBAR_WIDTH } from '@/constants/timeline';

export function useResizeSidebar() {
  const setSidebarWidth = useStore((s) => s.setSidebarWidth);
  const isDraggingRef = useRef(false);

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      isDraggingRef.current = true;
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';

      const target = e.target as HTMLElement;
      target.setPointerCapture(e.pointerId);

      const handlePointerMove = (moveEvent: PointerEvent) => {
        if (!isDraggingRef.current) return;
        const newWidth = Math.min(MAX_SIDEBAR_WIDTH, Math.max(MIN_SIDEBAR_WIDTH, moveEvent.clientX));
        setSidebarWidth(newWidth);
      };

      const handlePointerUp = () => {
        isDraggingRef.current = false;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        target.onpointermove = null;
        target.onpointerup = null;
      };

      target.onpointermove = handlePointerMove;
      target.onpointerup = handlePointerUp;
    },
    [setSidebarWidth],
  );

  return { onPointerDown };
}
