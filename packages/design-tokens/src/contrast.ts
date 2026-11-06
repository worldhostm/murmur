/**
 * WCAG 2.x 상대 휘도·대비율 계산. DESIGN_SYSTEM.md §0-5의 대비 기준(본문 4.5:1, 큰 글자·아이콘 3:1)을
 * 테스트에서 검증하는 데 쓴다. 런타임 UI 코드에서는 쓰지 않는다(조합표가 이미 검증되어 있다).
 */

export type Hex = `#${string}`;

export function hexToRgb(hex: string): [number, number, number] {
  const m = /^#([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) throw new Error(`6자리 hex 색만 지원합니다: ${hex}`);
  const n = parseInt(m[1]!, 16);
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
}

function channel(v: number): number {
  const s = v / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

export function relativeLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/** 두 색의 대비율 (1 ~ 21). 순서는 상관없다. */
export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const [hi, lo] = la >= lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

export const CONTRAST_BODY_TEXT = 4.5;
export const CONTRAST_LARGE_TEXT_AND_UI = 3;
