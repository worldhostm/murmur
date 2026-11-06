/** 토큰 hex에 알파를 입힌다. 통화 컨트롤의 night 80% 같은 경우에만 쓴다. */
export function withAlpha(hex: string, alpha: number): string {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) throw new Error(`6자리 hex만 지원: ${hex}`);
  const n = parseInt(m[1]!, 16);
  const a = Math.round(Math.min(1, Math.max(0, alpha)) * 1000) / 1000;
  return `rgba(${(n >> 16) & 0xff}, ${(n >> 8) & 0xff}, ${n & 0xff}, ${a})`;
}
