import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { AiCharacterId, ScreenKind, ThemePreference } from '@murmur/shared-types';
import { cueFromText, reactionTo } from '@murmur/expression-cues';
import type { SpriteExpression } from '@murmur/expression-cues';
import { ThemeProvider } from '../theme';
import {
  CallScreen,
  CharacterSelectScreen,
  OnboardingScreen,
  SoloScreen,
  UnsupportedDeviceScreen,
} from '../screens';
import { getDeviceSupport } from '../device/deviceSupport';
import { UnityView } from '../avatar/UnityView';
import { useFaceTracking } from '../avatar/useFaceTracking';
import { useAvatarExpression } from '../avatar/useAvatarExpression';
import { avatarAssetKeyFor } from '../avatar/characterAsset';
import { ScriptedReplyAdapter } from '../chat';
import type { ChatReplyAdapter, ChatTurn } from '../chat';
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
  /** 솔로 채팅 답 어댑터. 기본은 i18n 대사를 쓰는 ScriptedReplyAdapter (ai-character 서비스 연결 전). */
  replyAdapter?: ChatReplyAdapter;
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
  replyAdapter,
}: AppNavigatorProps): React.JSX.Element {
  const [route, setRoute] = useState<Route>(initialRoute);
  // 마지막으로 고른 AI 캐릭터. 통화 화면의 아바타 에셋 키가 된다.
  const [characterId, setCharacterId] = useState<AiCharacterId | undefined>(
    initialRoute.name === 'solo' ? initialRoute.characterId : undefined,
  );
  const [messages, setMessages] = useState<SoloMessage[]>([]);
  // 솔로 채팅: 캐릭터가 지금 짓는 표정과 답을 만드는 중인지. 내 말에는 듣는 표정으로, 답에는 답의 표정으로 바뀐다.
  const [expression, setExpression] = useState<SpriteExpression>('softSmile');
  const [speaking, setSpeaking] = useState(false);
  const [support, setSupport] = useState<DeviceSupport | null>(deviceSupportOverride ?? null);
  const { t } = useTranslation();
  const replySeq = useRef(0);
  const nextId = useRef(0);
  const adapter = useMemo<ChatReplyAdapter>(
    () =>
      replyAdapter ??
      new ScriptedReplyAdapter({
        lines: (id, group) => t(`reply.${id}.${group}`, { returnObjects: true }) as string[],
        crisisText: () => t('safety.crisisBody'),
      }),
    [replyAdapter, t],
  );
  // 솔로 화면에 있을 때만 카메라 없이 표정만 구동한다 (docs/specs/chat-expression.md).
  useAvatarExpression({
    enabled: route.name === 'solo',
    assetKey: avatarAssetKeyFor(characterId),
    expression,
  });
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

  const send = useCallback(
    (text: string) => {
      if (route.name !== 'solo') return;
      const history: ChatTurn[] = messages.map((m) => ({ from: m.from, text: m.text }));
      setMessages((prev) => [...prev, { id: String(++nextId.current), from: 'me', text }]);
      setExpression(reactionTo(cueFromText(text)));
      setSpeaking(true);
      const seq = ++replySeq.current;
      adapter
        .reply({ characterId: route.characterId, history, text })
        .then((reply) => {
          if (seq !== replySeq.current) return; // 더 최신 메시지가 있으면 이 답은 버린다
          setMessages((prev) => [
            ...prev,
            { id: String(++nextId.current), from: 'character', text: reply.text },
          ]);
          setExpression(reply.expression ?? cueFromText(reply.text));
        })
        .catch(() => setExpression('softSmile'))
        .finally(() => {
          if (seq === replySeq.current) setSpeaking(false);
        });
    },
    [adapter, messages, route],
  );

  if (support === null) {
    return (
      <ThemeProvider screen="onboarding" userPreference={userPreference}>
        {null}
      </ThemeProvider>
    );
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
          speaking={speaking}
          renderer={<UnityView />}
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
