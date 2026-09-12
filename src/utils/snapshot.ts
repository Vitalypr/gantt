import { domToCanvas, domToSvg } from 'modern-screenshot';
import { slugifyChartName } from '@/utils/persistence';

export async function snapshotGantt(chartName: string): Promise<void> {
  const grid = document.querySelector('[data-gantt-grid]') as HTMLElement | null;
  if (!grid) throw new Error('snapshotGantt: [data-gantt-grid] is not in the document');

  // The CURRENT theme's background. Hardcoding white rendered a dark-mode chart as light
  // text on white — an export that looked broken for anyone using dark mode.
  const backgroundColor =
    getComputedStyle(document.documentElement).getPropertyValue('--color-background').trim() ||
    '#ffffff';

  const canvas = await domToCanvas(grid, { scale: 2, backgroundColor });

  const now = new Date();
  const dd = String(now.getDate()).padStart(2, '0');
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const yy = String(now.getFullYear()).slice(-2);
  const hh = String(now.getHours()).padStart(2, '0');
  const min = String(now.getMinutes()).padStart(2, '0');
  const fileName = `${slugifyChartName(chartName)}_${dd}.${mm}.${yy}-${hh}.${min}.jpg`;

  // Copy PNG to clipboard (Clipboard API only supports PNG)
  try {
    const pngBlob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error('toBlob failed'))),
        'image/png',
      );
    });
    await navigator.clipboard.write([
      new ClipboardItem({ 'image/png': pngBlob }),
    ]);
  } catch {
    // Clipboard write may fail (permissions, non-secure context) — still download
  }

  // Download as JPEG. Awaited by the caller, which shows a spinner and reports failure —
  // this used to be a floating promise whose rejection vanished.
  canvas.toBlob(
    (blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 500);
    },
    'image/jpeg',
    0.92,
  );
}

/**
 * Vector (SVG) export of the same capture root.
 *
 * A JPEG pasted into a deck and projected is soft; an SVG stays sharp at any size and its
 * text stays selectable. Shares the capture root and the theme-aware background with
 * `snapshotGantt` so the two exports can never disagree about what is in the picture.
 */
export async function snapshotGanttSvg(chartName: string): Promise<void> {
  const grid = document.querySelector('[data-gantt-grid]') as HTMLElement | null;
  if (!grid) throw new Error('snapshotGanttSvg: [data-gantt-grid] is not in the document');

  const backgroundColor =
    getComputedStyle(document.documentElement).getPropertyValue('--color-background').trim() ||
    '#ffffff';

  // `domToSvg` returns the markup directly.
  const markup = await domToSvg(grid, { backgroundColor });
  const blob = new Blob([markup], { type: 'image/svg+xml;charset=utf-8' });

  const now = new Date();
  const dd = String(now.getDate()).padStart(2, '0');
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const yy = String(now.getFullYear()).slice(-2);
  const hh = String(now.getHours()).padStart(2, '0');
  const min = String(now.getMinutes()).padStart(2, '0');
  downloadBlob(blob, `${slugifyChartName(chartName)}_${dd}.${mm}.${yy}-${hh}.${min}.svg`);
}

/** One download path, so every export cleans up its object URL the same way. */
export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  // Delayed so mobile browsers can start the download before the URL is revoked.
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 500);
}
