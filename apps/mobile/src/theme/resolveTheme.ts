import type { ScreenKind, ThemeId, ThemePreference } from '@murmur/shared-types';

export interface ResolveThemeParams {
  screen: ScreenKind;
  userPreference: ThemePreference;
  systemScheme: ThemeId;
}

const LIGHT_SCREENS: readonly ScreenKind[] = ['solo', 'onboarding', 'character-select'];
const DARK_SCREENS: readonly ScreenKind[] = ['random-match', 'room-call'];

/**
 * 테마 결정 (DESIGN_SYSTEM.md §2).
 * 1. 사용자가 고른 값이 있으면 항상 우선한다.
 * 2. 솔로·온보딩·캐릭터 고르기는 light, 랜덤 매칭·방 통화는 dark.
 * 3. 그 외는 OS 설정을 따른다.
 */
export function resolveTheme({ screen, userPreference, systemScheme }: ResolveThemeParams): ThemeId {
  if (userPreference !== 'system') return userPreference;
  if (LIGHT_SCREENS.includes(screen)) return 'light';
  if (DARK_SCREENS.includes(screen)) return 'dark';
  return systemScheme;
}
