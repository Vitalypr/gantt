const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/;

/** Returns true if the hex color is dark (text on it should be white). */
export function isColorDark(hex: string): boolean {
  if (!HEX_COLOR_RE.test(hex)) return true;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance < 0.6;
}
