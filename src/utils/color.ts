const HEX_COLOR_RE = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

/** The two label colours a bar can use. */
export const LABEL_LIGHT = '#ffffff';
export const LABEL_DARK = '#0f172a';

function parseHex(hex: string): [number, number, number] | null {
  if (!HEX_COLOR_RE.test(hex)) return null;
  let h = hex.slice(1);
  if (h.length === 3) h = h[0]! + h[0]! + h[1]! + h[1]! + h[2]! + h[2]!;
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

/** sRGB channel -> linear light. This gamma step is what a YIQ shortcut omits. */
function linearise(channel8: number): number {
  const c = channel8 / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

/** WCAG relative luminance (WCAG 2.x, 1.4.3). */
export function relativeLuminance(hex: string): number {
  const rgb = parseHex(hex);
  if (!rgb) return 0;
  const [r, g, b] = rgb;
  return 0.2126 * linearise(r) + 0.7152 * linearise(g) + 0.0722 * linearise(b);
}

/** WCAG contrast ratio between two colours, 1:1 to 21:1. */
export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * The label colour that actually scores higher against `background`.
 *
 * Measured, not eyeballed. A YIQ-style shortcut (`0.299r + 0.587g + 0.114b` with a fixed
 * threshold) skips the sRGB->linear gamma step and misclassifies saturated mid-tones: it put
 * white text at roughly 2.3–2.8:1 on the orange, green, teal and cyan swatches — below the
 * 3:1 floor for ANY text size — where dark text scores 6.4–7.8:1.
 */
export function pickLabelColor(background: string): string {
  return contrastRatio(LABEL_LIGHT, background) >= contrastRatio(LABEL_DARK, background)
    ? LABEL_LIGHT
    : LABEL_DARK;
}

/** True when a white label wins on this background. */
export function isColorDark(hex: string): boolean {
  return pickLabelColor(hex) === LABEL_LIGHT;
}
