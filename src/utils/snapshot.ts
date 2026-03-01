import { domToCanvas } from 'modern-screenshot';

export async function snapshotGantt(chartName: string): Promise<void> {
  const grid = document.querySelector('[data-gantt-grid]') as HTMLElement | null;
  if (!grid) return;

  const canvas = await domToCanvas(grid, {
    scale: 2,
    backgroundColor: '#ffffff',
  });

  const now = new Date();
  const dd = String(now.getDate()).padStart(2, '0');
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const yy = String(now.getFullYear()).slice(-2);
  const hh = String(now.getHours()).padStart(2, '0');
  const min = String(now.getMinutes()).padStart(2, '0');
  const safeName = chartName.replace(/[^a-z0-9]/gi, '-').replace(/-+/g, '-').toLowerCase();
  const fileName = `${safeName}_${dd}.${mm}.${yy}-${hh}.${min}.jpg`;

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

  // Download as JPEG
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
