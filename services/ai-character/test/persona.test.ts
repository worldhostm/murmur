import { describe, expect, it } from 'vitest';
import { AI_CHARACTER_IDS } from '@murmur/shared-types';
import { buildSystemPrompt, COMMON_FORBIDDEN, PERSONAS } from '../src/persona';
import { NEUTRAL_SIGNALS } from '../src/signals';

describe('personas', () => {
  it('has every shared-types character, each with common forbidden list', () => {
    expect(Object.keys(PERSONAS).sort()).toEqual([...AI_CHARACTER_IDS].sort());
    for (const p of Object.values(PERSONAS)) {
      for (const f of COMMON_FORBIDDEN) expect(p.forbidden).toContain(f);
      expect(p.exampleLines.length).toBeGreaterThan(0);
      expect(p.crisisProtocol).toContain('109');
    }
  });

  it('system prompt states AI, includes solo principles and crisis line', () => {
    const p = buildSystemPrompt(PERSONAS['han-seorin'], {
      mode: 'solo',
      adultVerified: true,
      signals: NEUTRAL_SIGNALS,
    });
    expect(p).toContain('AI 캐릭터');
    expect(p).toContain('듣기 좋은 말만 반복하지 않는다');
    expect(p).toContain('사람과의 연결');
    expect(p).toContain('109');
    expect(p).not.toContain('로맨스');
  });

  it('forbids romance when not adult-verified and reflects signals', () => {
    const p = buildSystemPrompt(PERSONAS['leon-hart'], {
      mode: 'ai-call',
      adultVerified: false,
      signals: { smile: 0.9, frown: 0, gazeAway: 0, fatigue: 0.8 },
    });
    expect(p).toContain('로맨스');
    expect(p).toContain('웃고 있음');
    expect(p).toContain('지쳐 보임');
    expect(p).not.toContain('솔로 모드 원칙');
  });
});
