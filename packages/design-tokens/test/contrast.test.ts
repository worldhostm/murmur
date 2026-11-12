import { describe, expect, it } from 'vitest';
import { color, THEME_IDS, type ColorToken } from '../dist/tokens';
import { contrastRatio, CONTRAST_BODY_TEXT, CONTRAST_LARGE_TEXT_AND_UI } from '../src/contrast';

/**
 * docs/DESIGN_SYSTEM.md §3 "검증된 글자/배경 조합" 표.
 * 표의 숫자는 두 배경 중 낮은 쪽 기준이므로 여기서는 각 조합을 모두 검사한다.
 * 새 조합을 UI에서 쓰려면 이 목록에 추가해야 한다 (§0-5).
 */
const BODY_TEXT_PAIRS: [ColorToken, ColorToken][] = [
  ['ink', 'surface100'],
  ['ink', 'surface200'],
  ['ink', 'surface300'],
  ['inkMuted', 'surface100'],
  ['inkMuted', 'surface200'],
  ['inkMuted', 'surface300'],
  ['brand', 'surface100'],
  ['onBrand', 'brand'],
  ['onDanger', 'danger'],
  ['brand', 'surface300'],
  ['accent', 'surface300'],
  ['inkOnNight', 'night'],
  ['inkMuted', 'cream'],
  ['ink', 'cream'],
  ['danger', 'surface100'],
  ['danger', 'cream'],
  ['danger', 'surface200'],
  ['success', 'surface100'],
  ['warning', 'surface100'],
];

const UI_PAIRS: [ColorToken, ColorToken][] = [
  ['borderStrong', 'surface300'],
  ['borderStrong', 'surface200'],
  ['brand', 'surface200'],
  ['danger', 'surface200'],
];

/** 문서 표에 적힌 값 (소수 둘째 자리). 토큰을 바꾸면 문서도 같이 고쳐야 한다. */
const DOCUMENTED: { fg: ColorToken; bg: ColorToken; light: number; dark: number }[] = [
  { fg: 'inkMuted', bg: 'surface200', light: 6.16, dark: 8.15 },
  { fg: 'inkMuted', bg: 'surface300', light: 7.05, dark: 7.46 },
  { fg: 'brand', bg: 'surface100', light: 6.08, dark: 7.27 },
  { fg: 'onBrand', bg: 'brand', light: 6.39, dark: 7.03 },
  { fg: 'accent', bg: 'surface300', light: 5.54, dark: 7.95 },
  { fg: 'inkOnNight', bg: 'night', light: 15.69, dark: 13.23 },
  { fg: 'inkMuted', bg: 'cream', light: 6.59, dark: 6.94 },
  { fg: 'ink', bg: 'cream', light: 16.22, dark: 13.6 },
  { fg: 'borderStrong', bg: 'surface300', light: 3.7, dark: 3.54 },
];

describe('contrast (DESIGN_SYSTEM.md §0-5, §3)', () => {
  for (const theme of THEME_IDS) {
    const c = color[theme];
    describe(theme, () => {
      it.each(BODY_TEXT_PAIRS)('%s on %s ≥ 4.5:1', (fg, bg) => {
        expect(contrastRatio(c[fg], c[bg])).toBeGreaterThanOrEqual(CONTRAST_BODY_TEXT);
      });
      it.each(UI_PAIRS)('%s on %s ≥ 3:1', (fg, bg) => {
        expect(contrastRatio(c[fg], c[bg])).toBeGreaterThanOrEqual(CONTRAST_LARGE_TEXT_AND_UI);
      });
    });
  }

  it.each(DOCUMENTED)('documented ratio $fg/$bg matches tokens', ({ fg, bg, light, dark }) => {
    expect(contrastRatio(color.light[fg], color.light[bg])).toBeCloseTo(light, 2);
    expect(contrastRatio(color.dark[fg], color.dark[bg])).toBeCloseTo(dark, 2);
  });
});
