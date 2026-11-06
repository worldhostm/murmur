import { describe, expect, it } from 'vitest';
import { crisisResponse, detectCrisis, shouldSuggestRest } from '../src/safety';

describe('safety', () => {
  it.each(['요즘 자살 생각이 나', '그냥 죽고 싶어', 'I want to kill myself', '자해했어'])(
    'detects crisis: %s',
    (t) => expect(detectCrisis(t)).toBe(true),
  );
  it.each(['오늘 면접 봤어', '피곤하다', '배고파 죽겠다는 말은 안 함'])('no crisis: %s', (t) =>
    expect(detectCrisis(t)).toBe(false),
  );

  it('crisis response references hotline 109 and service voice', () => {
    const r = crisisResponse();
    expect(r).toContain('109');
    expect(r).toContain('AI 캐릭터');
  });

  it('shouldSuggestRest: long session or late night', () => {
    expect(shouldSuggestRest({ sessionMinutes: 10, localHour: 14 })).toBe(false);
    expect(shouldSuggestRest({ sessionMinutes: 90, localHour: 14 })).toBe(true);
    expect(shouldSuggestRest({ sessionMinutes: 5, localHour: 2 })).toBe(true);
    expect(shouldSuggestRest({ sessionMinutes: 5, localHour: 5 })).toBe(false);
  });
});
