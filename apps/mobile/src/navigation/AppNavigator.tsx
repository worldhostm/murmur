import React, { useCallback, useEffect, useState } from 'react';
import type { AiCharacterId, ScreenKind, ThemePreference } from '@murmur/shared-types';
import { ThemeProvider } from '../theme';
import { CallScreen, CharacterSelectScreen, OnboardingScreen, SoloScreen, UnsupportedDeviceScreen } from '../screens';
import { getDeviceSupport } from '../device/deviceSupport';
import type { DeviceSupport } from '../device/deviceSupport';
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
  /** 테스트용. 지정하면 네이티브 판정을 건너뛴다. */
  deviceSupportOverride?: DeviceSupport;
}

export function AppNavigator({
  initialRoute = { name: 'onboarding' },
  userPreference = 'system',
  deviceSupportOverride,
}: AppNavigatorProps): React.JSX.Element {
  const [route, setRoute] = useState<Route>(initialRoute);
  const [messages, setMessages] = useState<SoloMessage[]>([]);
  const [support, setSupport] = useState<DeviceSupport | null>(deviceSupportOverride ?? null);

  // 지원 기기 판정 (docs/specs/device-support.md). 판정 전에는 아무것도 그리지 않는다.
  useEffect(() => {
    if (deviceSupportOverride) return;
    let alive = true;
    getDeviceSupport().then((s) => alive && setSupport(s));
    return () => {
      alive = false;
    };
  }, [deviceSupportOverride]);

  const send = useCallback((text: string) => {
    // 실제 응답은 services/ai-character 연결 후. 지금은 사용자 메시지만 쌓는다.
    setMessages((prev) => [...prev, { id: String(prev.length + 1), from: 'me', text }]);
  }, []);

  if (support === null) {
    return <ThemeProvider screen="onboarding" userPreference={userPreference}>{null}</ThemeProvider>;
  }
  if (!support.supported) {
    return (
      <ThemeProvider screen="onboarding" userPreference={userPreference}>
        <UnsupportedDeviceScreen support={support} />
      </ThemeProvider>
    );
  }

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
