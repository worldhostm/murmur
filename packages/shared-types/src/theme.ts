/** 테마 ID. 값은 @murmur/design-tokens의 THEME_IDS와 같아야 한다 (테스트로 고정). */
export type ThemeId = 'light' | 'dark';

/** 사용자가 설정에서 고르는 값. 'system'이면 화면 종류와 OS 설정으로 결정한다. */
export type ThemePreference = ThemeId | 'system';

/**
 * 테마 결정에 쓰는 화면 종류 (DESIGN_SYSTEM.md §2).
 * light 고정: solo, onboarding, character-select / dark 고정: random-match, room-call / 그 외: OS 설정.
 */
export type ScreenKind =
  | 'solo'
  | 'onboarding'
  | 'character-select'
  | 'random-match'
  | 'room-call'
  | 'ai-call'
  | 'other';
