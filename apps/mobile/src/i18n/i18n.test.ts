import { createInstance } from 'i18next';
import i18n, { configureI18n, resources } from './index';

function flattenKeys(obj: Record<string, unknown>, prefix = ''): string[] {
  return Object.entries(obj).flatMap(([k, v]) =>
    v && typeof v === 'object' ? flattenKeys(v as Record<string, unknown>, `${prefix}${k}.`) : [`${prefix}${k}`],
  );
}

function flattenValues(obj: Record<string, unknown>): string[] {
  return Object.values(obj).flatMap((v) =>
    v && typeof v === 'object' ? flattenValues(v as Record<string, unknown>) : [String(v)],
  );
}

/** DESIGN_SYSTEM.md §9: 재촉·압박 문구 금지. */
const FORBIDDEN_KO = ['지금 결제', '놓치면', '후회', '서두르', '마지막 기회', '한정'];
const FORBIDDEN_EN = ['buy now', 'last chance', "don't miss", 'hurry', 'limited time'];

describe('i18n (DESIGN_SYSTEM.md §9)', () => {
  it('resolves the chat design labels in Korean', () => {
    expect(i18n.t('design.journalShort', { lng: 'ko' })).toBe('기록');
    expect(i18n.t('design.friendShort', { lng: 'ko' })).toBe('친구 연결');
    expect(i18n.t('design.chatWelcome', { lng: 'ko' })).toBe('편한 속도로, 당신의 이야기부터.');
    expect(i18n.t('design.samples', { lng: 'ko' })).toBe('표정 테스트 문장 보기');
  });

  it('refreshes missing and stale translations on an initialized instance without changing its language', async () => {
    const existing = createInstance();
    await existing.init({
      lng: 'en',
      resources: {
        ko: { translation: { design: { journalShort: '이전 문구' } } },
        en: { translation: {} },
      },
    });
    expect(existing.t('design.friendShort')).toBe('design.friendShort');
    const refresh = jest.fn();
    existing.on('languageChanged', refresh);

    configureI18n(existing);

    expect(existing.language).toBe('en');
    expect(existing.t('design.friendShort')).toBe('Friends');
    expect(existing.t('design.journalShort', { lng: 'ko' })).toBe('기록');
    expect(refresh).toHaveBeenCalledWith('en');
  });

  it('ko and en have identical key sets', () => {
    expect(flattenKeys(resources.en.translation).sort()).toEqual(flattenKeys(resources.ko.translation).sort());
  });

  it('has no pushy phrasing', () => {
    const ko = flattenValues(resources.ko.translation);
    const en = flattenValues(resources.en.translation).map((s) => s.toLowerCase());
    expect(FORBIDDEN_KO.filter((bad) => ko.some((s) => s.includes(bad)))).toEqual([]);
    expect(FORBIDDEN_EN.filter((bad) => en.some((s) => s.includes(bad)))).toEqual([]);
  });

  it('ko UI copy uses 해요체 (no 합니다/하십시오 endings)', () => {
    const ko = flattenValues(resources.ko.translation);
    expect(ko.filter((s) => /(합니다|하십시오|하세요\.)$/.test(s))).toEqual([]);
  });

  it('always has the AI character label and crisis hotline', () => {
    expect(i18n.t('common.aiCharacter')).toBe('AI 캐릭터');
    expect(i18n.t('safety.crisisBody')).toContain('109');
    expect(i18n.t('character.seo-doyoon.name')).toBe('서도윤');
  });
});
