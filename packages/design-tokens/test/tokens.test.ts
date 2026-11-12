import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import tokensJson from '../tokens.json';
import {
  color,
  space,
  radius,
  text,
  fontFamily,
  THEME_IDS,
  TOKENS_VERSION,
  size,
} from '../dist/tokens';
import { renderTs, renderCs, camel, pascal } from '../scripts/generate';

const PKG = join(import.meta.dirname, '..');

describe('tokens.json → dist', () => {
  it('generated files are up to date (run `pnpm generate`)', () => {
    expect(readFileSync(join(PKG, 'dist/tokens.ts'), 'utf8')).toBe(renderTs(tokensJson as never));
    expect(readFileSync(join(PKG, 'dist/Tokens.cs'), 'utf8')).toBe(renderCs(tokensJson as never));
  });

  it('every color token exists in every theme with a 6-digit hex', () => {
    for (const theme of THEME_IDS) {
      for (const tok of tokensJson.color.tokens) {
        const v = color[theme][camel(tok.name) as keyof typeof color.light];
        expect(v, `${tok.name}/${theme}`).toMatch(/^#[0-9A-F]{6}$/);
      }
    }
    expect(Object.keys(color.light)).toHaveLength(tokensJson.color.tokens.length);
    expect(Object.keys(color.light)).toEqual(Object.keys(color.dark));
  });

  it('name mapping follows DESIGN_SYSTEM.md §10 (kebab → camelCase, C# → PascalCase)', () => {
    expect(camel('on-brand')).toBe('onBrand');
    expect(camel('surface-100')).toBe('surface100');
    expect(camel('ink-on-night')).toBe('inkOnNight');
    expect(pascal('border-strong')).toBe('BorderStrong');
    expect(color.light.onBrand).toBe('#FFFFFF');
    expect(color.dark.surface100).toBe('#0E0B14');
  });

  it('spacing is on a 4px grid and keyed by N of space-N', () => {
    expect(space).toEqual({ 1: 4, 2: 8, 3: 12, 4: 16, 6: 24, 8: 32, 12: 48 });
    for (const v of Object.values(space)) expect(v % 4).toBe(0);
  });

  it('radius matches §6', () => {
    expect(radius).toEqual({ sm: 8, md: 16, lg: 24, pill: 999 });
  });

  it('text styles match §4 and use RN string fontWeight', () => {
    expect(fontFamily).toEqual({ display: 'Noto Serif KR', sans: 'Noto Sans KR' });
    expect(text.displayLg).toEqual({
      fontFamily: 'Noto Serif KR',
      fontSize: 40,
      lineHeight: 48,
      fontWeight: '600',
    });
    expect(text.body).toEqual({
      fontFamily: 'Noto Sans KR',
      fontSize: 16,
      lineHeight: 26,
      fontWeight: '400',
    });
    expect(text.caption).toEqual({
      fontFamily: 'Noto Sans KR',
      fontSize: 12,
      lineHeight: 16,
      fontWeight: '500',
    });
    expect(Object.keys(text)).toEqual([
      'displayLg',
      'displayMd',
      'displayCompact',
      'characterName',
      'title',
      'heading',
      'body',
      'bodySm',
      'label',
      'caption',
    ]);
    for (const s of Object.values(text)) expect(s.lineHeight).toBeGreaterThan(s.fontSize);
  });

  it('component sizes follow §7', () => {
    expect(size.buttonHeight).toBe(52);
    expect(size.callControl).toBe(56);
    expect(size.touchTarget).toBe(48);
    expect(TOKENS_VERSION).toBe(tokensJson.version);
  });

  it('C# output is parseable in shape', () => {
    const cs = readFileSync(join(PKG, 'dist/Tokens.cs'), 'utf8');
    expect(cs).toContain('namespace Murmur.Design');
    expect(cs).toContain(
      'public static readonly Color32 Brand = new Color32(107, 63, 212, 255); // #6B3FD4',
    );
    expect(cs).toContain('public const float Pill = 999f;');
    const open = (cs.match(/{/g) ?? []).length;
    const close = (cs.match(/}/g) ?? []).length;
    expect(open).toBe(close);
  });
});
