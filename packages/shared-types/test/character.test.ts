import { describe, expect, it } from 'vitest';
import { THEME_IDS } from '@murmur/design-tokens';
import { AI_CHARACTERS, AI_CHARACTER_IDS } from '../src';
import type { ThemeId } from '../src';

describe('shared-types', () => {
  it('ThemeId matches design-tokens THEME_IDS', () => {
    const ids: ThemeId[] = [...THEME_IDS];
    expect(ids).toEqual(['light', 'dark']);
  });

  it('defines the 4 MVP AI characters once each, with night/light tone split 2/2', () => {
    expect(AI_CHARACTERS.map((c) => c.id)).toEqual(AI_CHARACTER_IDS);
    expect(new Set(AI_CHARACTER_IDS).size).toBe(4);
    expect(AI_CHARACTERS.filter((c) => c.tone === 'night').map((c) => c.id)).toEqual(['seo-doyoon', 'leon-hart']);
    expect(AI_CHARACTERS.filter((c) => c.tone === 'light').map((c) => c.id)).toEqual(['han-seorin', 'sera']);
  });

  it('every character is adult-only for romance and has i18n keys, not literal names', () => {
    for (const c of AI_CHARACTERS) {
      expect(c.adultOnlyRomance).toBe(true);
      expect(c.nameKey).toBe(`character.${c.id}.name`);
      expect(c.avatar.source).toBe('builtin');
    }
  });
});
