/**
 * tokens.json → dist/tokens.ts (React Native), dist/Tokens.cs (Unity)
 *
 * 사용: pnpm generate            생성
 *      pnpm generate:check      생성물이 tokens.json과 일치하는지만 확인 (CI)
 *
 * 생성물은 직접 수정하지 않는다. 값을 바꾸려면 tokens.json을 고치고 다시 생성한다.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

interface TokensJson {
  name: string;
  version: number;
  color: {
    themes: { id: string; name: string }[];
    tokens: { name: string; value: Record<string, string>; usage: string }[];
  };
  type: {
    families: Record<string, string>;
    groups: {
      name: string;
      family: string;
      styles: { name: string; fontSize: string; lineHeight: string; fontWeight: number }[];
    }[];
  };
  spacing: { tokens: { name: string; value: string; usage: string }[] };
  radius: { tokens: { name: string; value: string; usage: string }[] };
}

const PKG = resolve(import.meta.dirname, '..');
const SRC = join(PKG, 'tokens.json');
const OUT_TS = join(PKG, 'dist', 'tokens.ts');
const OUT_CS = join(PKG, 'dist', 'Tokens.cs');

export const camel = (s: string): string =>
  s.replace(/-([a-z0-9])/g, (_, c: string) => c.toUpperCase());
export const pascal = (s: string): string => {
  const c = camel(s);
  return c.charAt(0).toUpperCase() + c.slice(1);
};
const px = (v: string): number => {
  const m = /^(\d+(?:\.\d+)?)px$/.exec(v);
  if (!m) throw new Error(`px 값이 아닙니다: ${v}`);
  return Number(m[1]);
};
/** CSS 글꼴 스택("\"Noto Sans KR\", system-ui, ...")에서 첫 패밀리 이름만 꺼낸다. RN fontFamily용. */
const primaryFamily = (stack: string): string => {
  const m = /^\s*"([^"]+)"|^\s*'([^']+)'|^\s*([^,]+)/.exec(stack);
  return (m?.[1] ?? m?.[2] ?? m?.[3] ?? stack).trim();
};
const HEADER = (src: string) =>
  `// GENERATED FROM ${src} — DO NOT EDIT. 값을 바꾸려면 tokens.json을 고치고 \`pnpm generate\`.\n`;

export function renderTs(t: TokensJson): string {
  const themes = t.color.themes.map((x) => x.id);
  const lines: string[] = [HEADER('packages/design-tokens/tokens.json')];
  lines.push(`export const TOKENS_VERSION = ${t.version} as const;`);
  lines.push(`export const THEME_IDS = [${themes.map((x) => `'${x}'`).join(', ')}] as const;`);
  lines.push(`export type ThemeId = (typeof THEME_IDS)[number];`);
  lines.push('');
  lines.push('/** 색상 토큰. 테마별 hex. 용도는 docs/DESIGN_SYSTEM.md §3. */');
  lines.push('export const color = {');
  for (const theme of themes) {
    lines.push(`  ${theme}: {`);
    for (const tok of t.color.tokens) {
      lines.push(`    /** ${tok.usage} */`);
      lines.push(`    ${camel(tok.name)}: '${tok.value[theme]}',`);
    }
    lines.push('  },');
  }
  lines.push('} as const;');
  lines.push(`export type ColorToken = keyof (typeof color)['${themes[0]}'];`);
  lines.push(`export type ColorPalette = Record<ColorToken, string>;`);
  lines.push('');
  lines.push('/** 간격(px). 4px 단위. 키는 space-N의 N. */');
  lines.push('export const space = {');
  for (const tok of t.spacing.tokens) {
    const n = tok.name.replace(/^space-/, '');
    lines.push(`  /** ${tok.usage} */`);
    lines.push(`  ${n}: ${px(tok.value)},`);
  }
  lines.push('} as const;');
  lines.push(`export type SpaceToken = keyof typeof space;`);
  lines.push('');
  lines.push('/** 모서리 반지름(px). */');
  lines.push('export const radius = {');
  for (const tok of t.radius.tokens) {
    lines.push(`  /** ${tok.usage} */`);
    lines.push(`  ${camel(tok.name.replace(/^radius-/, ''))}: ${px(tok.value)},`);
  }
  lines.push('} as const;');
  lines.push(`export type RadiusToken = keyof typeof radius;`);
  lines.push('');
  lines.push('/** 글꼴 패밀리. RN fontFamily에는 첫 패밀리 이름을, 웹에는 CSS 스택을 쓴다. */');
  lines.push('export const fontFamily = {');
  for (const [k, v] of Object.entries(t.type.families)) lines.push(`  ${camel(k)}: '${primaryFamily(v)}',`);
  lines.push('} as const;');
  lines.push('export const fontFamilyCss = {');
  for (const [k, v] of Object.entries(t.type.families)) lines.push(`  ${camel(k)}: ${JSON.stringify(v)},`);
  lines.push('} as const;');
  lines.push(`export type FontFamilyToken = keyof typeof fontFamily;`);
  lines.push('');
  lines.push('/** 텍스트 스타일. RN Text style에 그대로 펼친다. fontWeight는 RN 규격대로 문자열. */');
  lines.push('export const text = {');
  for (const g of t.type.groups) {
    for (const s of g.styles) {
      lines.push(
        `  ${camel(s.name)}: { fontFamily: fontFamily.${camel(g.family)}, fontSize: ${px(s.fontSize)}, lineHeight: ${px(s.lineHeight)}, fontWeight: '${s.fontWeight}' },`,
      );
    }
  }
  lines.push('} as const;');
  lines.push(`export type TextStyleToken = keyof typeof text;`);
  lines.push('');
  lines.push('/** 컴포넌트 치수. DESIGN_SYSTEM.md §7. */');
  lines.push('export const size = {');
  lines.push('  /** 주·보조 버튼 높이 */');
  lines.push('  buttonHeight: 52,');
  lines.push('  /** 통화 컨트롤 지름 */');
  lines.push('  callControl: 56,');
  lines.push('  /** 최소 터치 영역 */');
  lines.push('  touchTarget: 48,');
  lines.push('  /** 통화 오버레이 글자 크기 배율 상한 */');
  lines.push('  callOverlayMaxFontScale: 1.3,');
  lines.push('} as const;');
  lines.push('');
  lines.push('/** 모션. 말하는 중 물결 링 주기(ms). "동작 줄이기"에서는 정지. */');
  lines.push('export const motion = {');
  lines.push('  speakingRippleMs: 1200,');
  lines.push('  speakingRippleCount: 3,');
  lines.push('} as const;');
  lines.push('');
  return lines.join('\n');
}

const hexToRgb = (hex: string): [number, number, number] => {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
};

export function renderCs(t: TokensJson): string {
  const l: string[] = [HEADER('packages/design-tokens/tokens.json')];
  l.push('// Unity(URP) 통화 화면 배경과 캐릭터 주변 장식에서만 쓴다. 텍스트 UI는 React Native가 그린다.');
  l.push('using UnityEngine;');
  l.push('');
  l.push('namespace Murmur.Design');
  l.push('{');
  l.push(`    public enum ThemeId { ${t.color.themes.map((x) => pascal(x.id)).join(', ')} }`);
  l.push('');
  l.push('    public static class Tokens');
  l.push('    {');
  l.push(`        public const int Version = ${t.version};`);
  l.push('');
  for (const theme of t.color.themes) {
    l.push(`        /// <summary>${theme.name}</summary>`);
    l.push(`        public static class ${pascal(theme.id)}`);
    l.push('        {');
    for (const tok of t.color.tokens) {
      const [r, g, b] = hexToRgb(tok.value[theme.id]!);
      l.push(`            /// <summary>${tok.usage}</summary>`);
      l.push(`            public static readonly Color32 ${pascal(tok.name)} = new Color32(${r}, ${g}, ${b}, 255); // ${tok.value[theme.id]}`);
    }
    l.push('        }');
    l.push('');
  }
  l.push('        public static class Space');
  l.push('        {');
  for (const tok of t.spacing.tokens) {
    l.push(`            public const float S${tok.name.replace(/^space-/, '')} = ${px(tok.value)}f; // ${tok.usage}`);
  }
  l.push('        }');
  l.push('');
  l.push('        public static class Radius');
  l.push('        {');
  for (const tok of t.radius.tokens) {
    l.push(`            public const float ${pascal(tok.name.replace(/^radius-/, ''))} = ${px(tok.value)}f; // ${tok.usage}`);
  }
  l.push('        }');
  l.push('');
  l.push('        public static class Motion');
  l.push('        {');
  l.push('            public const float SpeakingRippleSeconds = 1.2f;');
  l.push('            public const int SpeakingRippleCount = 3;');
  l.push('        }');
  l.push('    }');
  l.push('}');
  l.push('');
  return l.join('\n');
}

function main(): void {
  const check = process.argv.includes('--check');
  const tokens = JSON.parse(readFileSync(SRC, 'utf8')) as TokensJson;
  const outputs: [string, string][] = [
    [OUT_TS, renderTs(tokens)],
    [OUT_CS, renderCs(tokens)],
  ];
  if (check) {
    const stale = outputs.filter(([p, s]) => !existsSync(p) || readFileSync(p, 'utf8') !== s);
    if (stale.length > 0) {
      console.error('생성물이 tokens.json과 다릅니다. `pnpm generate`를 실행하세요:');
      for (const [p] of stale) console.error('  - ' + p);
      process.exit(1);
    }
    console.log('design-tokens 생성물 최신.');
    return;
  }
  mkdirSync(join(PKG, 'dist'), { recursive: true });
  for (const [p, s] of outputs) {
    writeFileSync(p, s);
    console.log('wrote ' + p);
  }
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.filename)) main();
