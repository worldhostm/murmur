import { describe, expect, it } from 'vitest';
import { cueFromText, reactionTo, SPRITE_EXPRESSIONS } from '../src';

describe('cueFromText', () => {
  it.each([
    ['오늘 너무 힘들었어', 'sad'],
    ['진짜 화나 죽겠어 짜증나', 'angry'],
    ['헐 대박 진짜?', 'surprised'],
    ['내일 면접인데 너무 긴장돼 걱정이야', 'worried'],
    ['아 민망해 ㅠ', 'flustered'],
    ['ㅋㅋㅋ 완전 좋아', 'bigSmile'],
    ['고마워 덕분에 괜찮아', 'smile'],
    ['생각해 보니 중요한 결정이야', 'serious'],
    ['오늘 뭐 먹지', 'neutral'],
    ['', 'neutral'],
    ["I'm so lonely tonight", 'sad'],
    ['OMG no way?!', 'surprised'],
    ['haha that was awesome', 'bigSmile'],
    ['thanks, feeling better', 'smile'],
  ])('%s → %s', (text, expected) => {
    expect(cueFromText(text)).toBe(expected);
  });

  it('mixed sentence picks the category with more hits', () => {
    expect(cueFromText('힘들었지만 그래도 완전 좋아 최고 ㅋㅋㅋ')).toBe('bigSmile');
  });

  it('a single ㅠ alone is not sadness', () => {
    expect(cueFromText('늦었다 ㅠ')).toBe('neutral');
    expect(cueFromText('ㅠㅠ')).toBe('sad');
  });

  it('always returns a sheet expression', () => {
    for (const text of ['!!!', '???', '😊😊', 'ㅋㅋ', 'ㅎㅎㅎㅎ']) {
      expect(SPRITE_EXPRESSIONS).toContain(cueFromText(text));
    }
  });
});

describe('reactionTo', () => {
  it('listens with empathy rather than mirroring negative emotions', () => {
    expect(reactionTo('sad')).toBe('worried');
    expect(reactionTo('angry')).toBe('serious');
    expect(reactionTo('neutral')).toBe('softSmile');
    expect(reactionTo('bigSmile')).toBe('bigSmile');
  });

  it('covers every expression', () => {
    for (const e of SPRITE_EXPRESSIONS) expect(SPRITE_EXPRESSIONS).toContain(reactionTo(e));
  });
});
