import React, { useCallback, useState } from 'react';
import type { AiCharacterId, ScreenKind, ThemePreference } from '@murmur/shared-types';
import { ThemeProvider } from '../theme';
import { CallScreen, CharacterSelectScreen, OnboardingScreen, SoloScreen } from '../screens';
import type { SoloMessage } from '../screens';

/**
 * 임시 내비게이터. 네이티브 프로젝트 생성 후 react-navigation으로 바꾼다 (화면 컴포넌트는 그대로).
 * 화면 종류(ScreenKind)가 테마를 결정하므로 ThemeProvider를 여기서 감싼다.
 */
export type Route =
  | { name: 'onboarding' }
  | { name: 'character-select' }
  | { name: 'solo'; characterId: AiCharacterId }
  | { name: 'random-match' };

const SCREEN_KIND: Record<Route['name'], ScreenKind> = {
  onboarding: 'onboarding',
  'character-select': 'character-select',
  solo: 'solo',
  'random-match': 'random-match',
};

export interface AppNavigatorProps {
  initialRoute?: Route;
  userPreference?: ThemePreference;
}

export function AppNavigator({ initialRoute = { name: 'onboarding' }, userPreference = 'system' }: AppNavigatorProps): React.JSX.Element {
  const [route, setRoute] = useState<Route>(initialRoute);
  const [messages, setMessages] = useState<SoloMessage[]>([]);

  const send = useCallback((text: string) => {
    // 실제 응답은 services/ai-character 연결 후. 지금은 사용자 메시지만 쌓는다.
    setMessages((prev) => [...prev, { id: String(prev.length + 1), from: 'me', text }]);
  }, []);

  let content: React.JSX.Element;
  switch (route.name) {
    case 'onboarding':
      content = <OnboardingScreen onStart={() => setRoute({ name: 'character-select' })} />;
      break;
    case 'character-select':
      content = <CharacterSelectScreen onConfirm={(characterId) => setRoute({ name: 'solo', characterId })} />;
      break;
    case 'solo':
      content = (
        <SoloScreen
          characterId={route.characterId}
          messages={messages}
          onSend={send}
          onSaveMood={() => undefined}
          onCallFriend={() => setRoute({ name: 'random-match' })}
        />
      );
      break;
    case 'random-match':
      content = (
        <CallScreen
          mode="random-match"
          state="connecting"
          peer={{ id: 'peer', isAi: false, avatarId: 'unknown', displayName: '' }}
          onToggleMute={() => undefined}
          onSwapAvatar={() => undefined}
          onReport={() => undefined}
          onEnd={() => setRoute({ name: 'character-select' })}
        />
      );
      break;
  }

  return (
    <ThemeProvider screen={SCREEN_KIND[route.name]} userPreference={userPreference}>
      {content}
    </ThemeProvider>
  );
}
