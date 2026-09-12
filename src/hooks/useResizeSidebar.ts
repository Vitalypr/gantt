import { useCallback } from 'react';
import { useStore } from '@/stores';
import { useLatest } from '@/hooks/useLatest';
import { useChartDirection } from '@/hooks/useChartDirection';
import { totalUnits as selectTotalUnits } from '@/stores/selectors';
import { fitUnitWidth, sidebarWidthFromDrag } from '@/utils/layout';
import {
  MIN_MONTH_WIDTH,
  MAX_MONTH_WIDTH,
  MIN_WEEK_WIDTH,
  MAX_WEEK_WIDTH,
} from '@/constants/timeline';

export function useResizeSidebar() {
  const setSidebarWidth = useStore((s) => s.setSidebarWidth);
  const setMonthWidth = useStore((s) => s.setMonthWidth);
  const setWeekWidth = useStore((s) => s.setWeekWidth);
  const { isRtl } = useChartDirection();
  const isRtlRef = useLatest(isRtl);

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      // Primary button only: a right-click here armed a resize whose pointerup never arrived,
      // leaving the divider following the cursor until the next click.
      if (e.button !== 0) return;

      const startX = e.clientX;
      const startWidth = useStore.getState().sidebarWidth;
      const rtl = isRtlRef.current;

      const target = e.target as HTMLElement;
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
      target.setPointerCapture(e.pointerId);

      const handlePointerMove = (moveEvent: PointerEvent) => {
        const width = sidebarWidthFromDrag(startWidth, moveEvent.clientX - startX, rtl);
        setSidebarWidth(width);
        refitColumns(width);
      };

      // Every timeline column shares one width, so re-fitting is what keeps them equal to each
      // other while the space they divide changes.
      const refitColumns = (width: number) => {
        const scroll = document.querySelector('[data-gantt-scroll]');
        if (!scroll) return;
        const state = useStore.getState();
        const weeks = state.timelineMode === 'weeks';
        const fitted = fitUnitWidth({
          containerWidth: scroll.clientWidth,
          sidebarWidth: width,
          totalUnits: selectTotalUnits(state),
          min: weeks ? MIN_WEEK_WIDTH : MIN_MONTH_WIDTH,
          max: weeks ? MAX_WEEK_WIDTH : MAX_MONTH_WIDTH,
        });
        if (fitted === null) return;
        if (weeks) setWeekWidth(fitted);
        else setMonthWidth(fitted);
      };

      const end = () => {
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        target.onpointermove = null;
        target.onpointerup = null;
        target.onpointercancel = null;
      };

      target.onpointermove = handlePointerMove;
      target.onpointerup = end;
      // Without this a cancelled gesture (a system drag, a touch turning into a scroll) leaves
      // the body stuck in col-resize with text selection disabled.
      target.onpointercancel = end;
    },
    [setSidebarWidth, setMonthWidth, setWeekWidth, isRtlRef],
  );

  return { onPointerDown };
}
