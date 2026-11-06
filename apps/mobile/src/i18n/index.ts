import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import ko from './locales/ko.json';
import en from './locales/en.json';

/**
 * 모든 UI 문구는 여기 키로만 쓴다 (DESIGN_SYSTEM.md §9).
 * 한국어·영어 먼저. 동남아 출시 시 th/vi/id를 추가한다.
 */
export const resources = { ko: { translation: ko }, en: { translation: en } } as const;

export type Locale = keyof typeof resources;
export const DEFAULT_LOCALE: Locale = 'ko';

if (!i18n.isInitialized) {
  void i18n.use(initReactI18next).init({
    resources,
    lng: DEFAULT_LOCALE,
    fallbackLng: 'ko',
    interpolation: { escapeValue: false },
    // Hermes 에는 Intl.PluralRules 가 없다. v3 복수형 규칙(_plural 접미사)을 쓴다.
    compatibilityJSON: 'v3',
    // i18next의 'character.seo-doyoon.name' 같은 키에서 '-'가 아닌 '.'만 구분자로 쓴다.
    keySeparator: '.',
    nsSeparator: false,
  });
}

export default i18n;
