import { describe, expect, it } from 'vitest';
import { THEME_IDS } from '@murmur/design-tokens';
import { AI_CHARACTERS, AI_CHARACTER_IDS, CHARACTER_CONCEPTS, charactersByConcept } from '../src';
import type { ThemeId } from '../src';

describe('shared-types', () => {
  it('ThemeId matches design-tokens THEME_IDS', () => {
    const ids: ThemeId[] = [...THEME_IDS];
    expect(ids).toEqual(['light', 'dark']);
  });

  it('defines the 4 MVP characters first, then the 10 roster characters, once each', () => {
    expect(AI_CHARACTERS.map((c) => c.id)).toEqual(AI_CHARACTER_IDS);
    expect(new Set(AI_CHARACTER_IDS).size).toBe(14);
    expect(AI_CHARACTER_IDS.slice(0, 4)).toEqual(['seo-doyoon', 'leon-hart', 'han-seorin', 'sera']);
    expect(AI_CHARACTER_IDS.slice(4)).toEqual([
      'lee-junseo',
      'kai',
      'ha-jun',
      'noah',
      'jeon-yuhyeon',
      'yoon-arin',
      'ciel',
      'do-hayeon',
      'ji-yuna',
      'moka',
    ]);
  });

  it('keeps the MVP tone split and gives every character a tone', () => {
    expect(AI_CHARACTERS.slice(0, 4).map((c) => c.tone)).toEqual(['night', 'night', 'light', 'light']);
    for (const c of AI_CHARACTERS) expect(['night', 'light']).toContain(c.tone);
  });

  it('every character is an adult, adult-only for romance, and uses i18n keys and builtin assets', () => {
    for (const c of AI_CHARACTERS) {
      expect(c.age).toBeGreaterThanOrEqual(19);
      expect(c.adultOnlyRomance).toBe(true);
      expect(c.nameKey).toBe(`character.${c.id}.name`);
      expect(c.taglineKey).toBe(`character.${c.id}.tagline`);
      expect(c.roleKey).toBe(`character.${c.id}.role`);
      expect(c.avatar.source).toBe('builtin');
      expect(c.avatar.assetKey).toBe(`characters/${c.id}/front`);
    }
  });

  it('assigns every character to one of the four concepts, and every concept has characters', () => {
    const conceptIds = CHARACTER_CONCEPTS.map((k) => k.id);
    expect(conceptIds).toEqual(['quiet-night', 'bright-stage', 'steady-ally', 'other-world']);
    for (const c of AI_CHARACTERS) expect(conceptIds).toContain(c.concept);
    const groups = charactersByConcept();
    expect(groups.map((g) => g.concept.id)).toEqual(conceptIds);
    expect(groups.flatMap((g) => g.characters.map((c) => c.id)).sort()).toEqual(
      [...AI_CHARACTER_IDS].sort(),
    );
    expect(Object.fromEntries(groups.map((g) => [g.concept.id, g.characters.map((c) => c.id)]))).toEqual({
      'quiet-night': ['seo-doyoon', 'han-seorin', 'ha-jun', 'ji-yuna'],
      'bright-stage': ['kai', 'noah', 'yoon-arin', 'moka'],
      'steady-ally': ['lee-junseo', 'jeon-yuhyeon', 'do-hayeon'],
      'other-world': ['leon-hart', 'sera', 'ciel'],
    });
  });

  it('drops empty concepts when grouping a subset', () => {
    const only = AI_CHARACTERS.filter((c) => c.id === 'moka');
    expect(charactersByConcept(only).map((g) => g.concept.id)).toEqual(['bright-stage']);
  });
});
