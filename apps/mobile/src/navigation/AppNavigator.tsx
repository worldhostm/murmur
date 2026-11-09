import React, { useCallback, useEffect, useState } from 'react';
import type { AiCharacterId, ScreenKind, ThemePreference } from '@murmur/shared-types';
import { ThemeProvider } from '../theme';
import { CallScreen, CharacterSelectScreen, OnboardingScreen, SoloScreen, UnsupportedDeviceScreen } from '../screens';
import { getDeviceSupport } from '../device/deviceSupport';
import { UnityView } from '../avatar/UnityView';
import { useFaceTracking } from '../avatar/useFaceTracking';
import { avatarAssetKeyFor } from '../avatar/characterAsset';
import type { FaceTrackingStatus } from '../avatar/useFaceTracking';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
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

const TRACKING_KEY: Record<FaceTrackingStatus, string | null> = {
  idle: null,
  starting: 'call.tracking.starting',
  tracking: 'call.tracking.tracking',
  limited: 'call.tracking.limited',
  lost: 'call.tracking.lost',
  'permission-denied': 'call.tracking.permissionDenied',
  error: 'call.tracking.error',
};

function trackingLabel(t: TFunction, status: FaceTrackingStatus, fps: number): string | undefined {
  const key = TRACKING_KEY[status];
  return key ? t(key, { fps }) : undefined;
}

export function AppNavigator({
  initialRoute = { name: 'onboarding' },
  userPreference = 'system',
  deviceSupportOverride,
}: AppNavigatorProps): React.JSX.Element {
  const [route, setRoute] = useState<Route>(initialRoute);
  // 마지막으로 고른 AI 캐릭터. 통화 화면의 아바타 에셋 키가 된다.
  const [characterId, setCharacterId] = useState<AiCharacterId | undefined>(
    initialRoute.name === 'solo' ? initialRoute.characterId : undefined,
  );
  const [messages, setMessages] = useState<SoloMessage[]>([]);
  const [support, setSupport] = useState<DeviceSupport | null>(deviceSupportOverride ?? null);
  const { t } = useTranslation();
  // 통화 화면에 있을 때만 트래킹. PoC: 내 표정을 remote 슬롯(큰 아바타)에도 비춘다.
  const tracking = useFaceTracking({
    enabled: route.name === 'random-match',
    mirrorToRemote: true,
    assetKey: avatarAssetKeyFor(characterId),
  });

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
      content = (
        <CharacterSelectScreen
          onConfirm={(id) => {
            setCharacterId(id);
            setRoute({ name: 'solo', characterId: id });
          }}
        />
      );
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
          renderer={<UnityView />}
          trackingLabel={trackingLabel(t, tracking.status, tracking.fps)}
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
