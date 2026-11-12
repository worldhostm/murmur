import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MoodPanel } from '../mood/MoodPanel';
import { MoodStore } from '../mood/MoodStore';
import { AvatarPreviewScreen } from '../screens/AvatarPreviewScreen';
import { BackHandler } from 'react-native';
import type { AiCharacterId, ScreenKind, ThemePreference } from '@murmur/shared-types';
import { cueFromText, reactionTo } from '@murmur/expression-cues';
import type { SpriteExpression } from '@murmur/expression-cues';
import { ThemeProvider, useReduceMotion } from '../theme';
import {
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
import { FallbackReplyAdapter, RemoteReplyAdapter, ScriptedReplyAdapter } from '../chat';
import type { ChatReplyAdapter, ChatTurn } from '../chat';
import { AI_CHARACTER_URL, SIGNALING_URL } from '../config';
import { CallLobby } from '../call/CallLobby';
import { signalingConnector, type ConnectSignaling } from '../call/SignalingClient';
import type { FaceTrackingStatus } from '../avatar/useFaceTracking';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import type { DeviceSupport } from '../device/deviceSupport';
import type { SoloMessage } from '../screens';

declare const __DEV__: boolean | undefined;

/**
 * 임시 내비게이터. 네이티브 프로젝트 생성 후 react-navigation으로 바꾼다 (화면 컴포넌트는 그대로).
 * 화면 종류(ScreenKind)가 테마를 결정하므로 ThemeProvider를 여기서 감싼다.
 */
export type Route =
  | { name: 'onboarding' }
  | { name: 'character-select' }
  | { name: 'solo'; characterId: AiCharacterId }
  | { name: 'random-match' }
  | { name: 'avatar-preview' }
  | { name: 'call-lobby' };

const SCREEN_KIND: Record<Route['name'], ScreenKind> = {
  onboarding: 'onboarding',
  'character-select': 'character-select',
  solo: 'solo',
  'random-match': 'random-match',
  'call-lobby': 'other',
  'avatar-preview': 'random-match',
};

export interface AppNavigatorProps {
  initialRoute?: Route;
  userPreference?: ThemePreference;
  /** 테스트용. 지정하면 네이티브 판정을 건너뛴다. */
  deviceSupportOverride?: DeviceSupport;
  /** 솔로 채팅 답 어댑터. 기본은 i18n 대사를 쓰는 ScriptedReplyAdapter (ai-character 서비스 연결 전). */
  replyAdapter?: ChatReplyAdapter;
  moodStore?: MoodStore;
  connectSignaling?: ConnectSignaling;
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
  moodStore,
  connectSignaling,
}: AppNavigatorProps): React.JSX.Element {
  const connect = useMemo(
    () => connectSignaling ?? (SIGNALING_URL ? signalingConnector(SIGNALING_URL) : undefined),
    [connectSignaling],
  );
  const store = useMemo(() => moodStore ?? new MoodStore(), [moodStore]);
  const [textOnly, setTextOnly] = useState(false);
  const [route, setRoute] = useState<Route>(initialRoute);
  // 마지막으로 고른 AI 캐릭터. 통화 화면의 아바타 에셋 키가 된다.
  const [characterId, setCharacterId] = useState<AiCharacterId | undefined>(
    initialRoute.name === 'solo' ? initialRoute.characterId : undefined,
  );
  const [messages, setMessages] = useState<SoloMessage[]>([]);
  // 솔로 채팅: 캐릭터가 지금 짓는 표정과 답을 만드는 중인지. 내 말에는 듣는 표정으로, 답에는 답의 표정으로 바뀐다.
  const [expression, setExpression] = useState<SpriteExpression>('softSmile');
  const [speaking, setSpeaking] = useState(false);
  const [replyFailed, setReplyFailed] = useState(false);
  const [conversationId, setConversationId] = useState(0);
  const pending = useRef(false);
  const [support, setSupport] = useState<DeviceSupport | null>(deviceSupportOverride ?? null);
  const { t } = useTranslation();
  // OS "동작 줄이기"를 Unity 에도 알린다 (아이들 모션·배경 빛 정지).
  const reduceMotion = useReduceMotion();
  const replySeq = useRef(0);
  const nextId = useRef(0);
  // 답 어댑터: 서버 주소가 있으면 원격(ai-character) → 실패 시 스크립트 폴백, 없으면 스크립트만.
  // 캐릭터가 바뀌면 원격 세션(대화 기록)도 새로 시작한다.
  const adapter = useMemo<ChatReplyAdapter>(() => {
    if (replyAdapter) return replyAdapter;
    const scripted = new ScriptedReplyAdapter({
      lines: (id, group) => t(`reply.${id}.${group}`, { returnObjects: true }) as string[],
      crisisText: () => t('safety.crisisBody'),
    });
    if (!AI_CHARACTER_URL) return scripted;
    return new FallbackReplyAdapter(
      new RemoteReplyAdapter({ baseUrl: AI_CHARACTER_URL }),
      scripted,
    );
  }, [replyAdapter, t, characterId, conversationId]);
  // 솔로 화면에 있을 때만 카메라 없이 표정만 구동한다 (docs/specs/chat-expression.md).
  useAvatarExpression({
    enabled: route.name === 'solo' && !textOnly,
    assetKey: avatarAssetKeyFor(characterId),
    expression,
    reduceMotion,
  });
  // 통화 화면에 있을 때만 트래킹. PoC: 내 표정을 remote 슬롯(큰 아바타)에도 비춘다.
  const tracking = useFaceTracking({
    enabled: route.name === 'avatar-preview' && !!support?.supported && !textOnly,
    mirrorToRemote: true,
    assetKey: avatarAssetKeyFor(characterId),
    reduceMotion,
  });

  const leaveSolo = useCallback(() => {
    replySeq.current++;
    pending.current = false;
    setMessages([]);
    setExpression('softSmile');
    setSpeaking(false);
    setReplyFailed(false);
    setConversationId((id) => id + 1);
  }, []);

  useEffect(
    () => () => {
      replySeq.current++;
    },
    [],
  );

  // 뒤로가기: 화면 왼쪽 상단 버튼과 Android BACK 키가 같은 길을 간다. 솔로를 떠나면 대화는 비운다.
  const goBack = useCallback((): boolean => {
    switch (route.name) {
      case 'character-select':
        setRoute({ name: 'onboarding' });
        return true;
      case 'solo':
        leaveSolo();
        setRoute({ name: 'character-select' });
        return true;
      case 'avatar-preview':
        setRoute({ name: 'call-lobby' });
        return true;
      case 'call-lobby':
      case 'random-match':
        setRoute({ name: 'character-select' });
        return true;
      default:
        return false; // 온보딩: 기본 동작(앱 나가기)
    }
  }, [route.name, leaveSolo]);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', goBack);
    return () => sub.remove();
  }, [goBack]);

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
      if (route.name !== 'solo' || pending.current || !text.trim()) return;
      pending.current = true;
      setReplyFailed(false);
      const history: ChatTurn[] = messages.map((m) => ({ from: m.from, text: m.text }));
      setMessages((prev) => [...prev, { id: String(++nextId.current), from: 'me', text }]);
      setExpression(reactionTo(cueFromText(text)));
      setSpeaking(true);
      const seq = ++replySeq.current;
      Promise.resolve()
        .then(() => adapter.reply({ characterId: route.characterId, history, text }))
        .then((reply) => {
          if (seq !== replySeq.current) return; // 종료한 대화의 답은 반영하지 않는다
          setMessages((prev) => [
            ...prev,
            { id: String(++nextId.current), from: 'character', text: reply.text },
          ]);
          setExpression(reply.expression ?? cueFromText(reply.text));
        })
        .catch(() => {
          if (seq !== replySeq.current) return;
          setExpression('softSmile');
          setReplyFailed(true);
        })
        .finally(() => {
          if (seq === replySeq.current) {
            pending.current = false;
            setSpeaking(false);
          }
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
  if (!support.supported && !textOnly) {
    return (
      <ThemeProvider screen="onboarding" userPreference={userPreference}>
        <UnsupportedDeviceScreen
          support={support}
          onContinueText={() => {
            setTextOnly(true);
            setRoute({ name: 'character-select' });
          }}
        />
      </ThemeProvider>
    );
  }

  let content: React.JSX.Element;
  switch (route.name) {
    case 'onboarding':
      content = (
        <OnboardingScreen
          onStart={() => {
            setTextOnly(false);
            setRoute({ name: 'character-select' });
          }}
          onText={() => {
            setTextOnly(true);
            setRoute({ name: 'character-select' });
          }}
        />
      );
      break;
    case 'character-select':
      content = (
        <CharacterSelectScreen
          initial={characterId}
          onBack={goBack}
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
          replyFailed={replyFailed}
          renderer={textOnly ? undefined : <UnityView />}
          onBack={goBack}
          samplePrompts={
            typeof __DEV__ !== 'undefined' && __DEV__
              ? (t('solo.samples', { returnObjects: true }) as string[])
              : undefined
          }
          onSend={send}
          moodPanel={<MoodPanel store={store} />}
          onSaveMood={(value) => {
            void store.save(value);
          }}
          onCallFriend={() => {
            leaveSolo();
            setRoute({ name: 'call-lobby' });
          }}
        />
      );
      break;
    case 'random-match':
    case 'call-lobby':
      content = (
        <CallLobby
          connect={connect}
          onPreview={
            typeof __DEV__ !== 'undefined' && __DEV__ && support.supported
              ? () => {
                  setTextOnly(false);
                  setRoute({ name: 'avatar-preview' });
                }
              : undefined
          }
          onBack={goBack}
          onText={() => {
            setTextOnly(true);
            setRoute({ name: 'solo', characterId: characterId ?? 'sera' });
          }}
        />
      );
      break;
    case 'avatar-preview':
      content = (
        <AvatarPreviewScreen
          onBack={goBack}
          renderer={<UnityView />}
          status={trackingLabel(t, tracking.status, tracking.fps)}
          onText={() => {
            setTextOnly(true);
            setRoute({ name: 'solo', characterId: characterId ?? 'sera' });
          }}
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
