import React from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { CallMode, CallState, Participant } from '@murmur/shared-types';
import { AiCharacterBadge, AppText, CallControl, SpeakingIndicator } from '../components';
import { useTheme, withAlpha } from '../theme';

export interface CallScreenProps {
  mode: CallMode;
  state: CallState;
  /** 화면에 보이는 상대 (1:1). 방 통화의 다중 타일은 추후. */
  peer: Participant;
  peerSpeaking?: boolean;
  muted?: boolean;
  roomCode?: string;
  onToggleMute: () => void;
  onSwapAvatar: () => void;
  onReport: () => void;
  onEnd: () => void;
  /** Unity 렌더 뷰가 들어갈 자리. 테스트에서는 비워 둔다. */
  renderer?: React.ReactNode;
}

/**
 * 통화 화면 (시나리오 A·B). 아바타가 주인공이므로 UI는 가장자리로 물러선다.
 * 오버레이(이름표, 컨트롤)는 테마와 무관하게 night + ink-on-night. 신고·차단은 한 번 탭.
 * 상대가 AI면 "AI 캐릭터" 표시를 항상 둔다.
 */
export function CallScreen(props: CallScreenProps): React.JSX.Element {
  const { t } = useTranslation();
  const { color, space, radius, size } = useTheme();
  const peerName = props.peer.displayNameKey ? t(props.peer.displayNameKey) : (props.peer.displayName ?? '');
  const statusKey =
    props.state === 'connecting'
      ? props.mode === 'random-match'
        ? 'call.matching'
        : 'common.connecting'
      : props.state === 'reconnecting'
        ? 'common.reconnecting'
        : null;

  return (
    <View testID="screen-call" style={{ flex: 1, backgroundColor: color.night }}>
      <View testID="avatar-renderer" style={{ flex: 1, borderRadius: radius.lg, overflow: 'hidden' }}>
        {props.renderer}
      </View>

      <View
        pointerEvents="box-none"
        style={{ position: 'absolute', top: space[8], left: space[4], right: space[4], gap: space[2] }}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: space[3],
            alignSelf: 'flex-start',
            padding: space[2],
            paddingRight: space[4],
            borderRadius: radius.pill,
            backgroundColor: withAlpha(color.night, 0.8),
          }}
        >
          <SpeakingIndicator speaking={!!props.peerSpeaking} diameter={size.touchTarget - space[2]}>
            <View style={{ width: space[6], height: space[6], borderRadius: radius.pill, backgroundColor: color.lavender }} />
          </SpeakingIndicator>
          <View style={{ gap: space[1] }}>
            <AppText variant="label" color={props.peer.isAi ? 'accent' : 'inkOnNight'} maxFontSizeMultiplier={size.callOverlayMaxFontScale}>
              {peerName}
            </AppText>
            {props.peer.isAi && <AiCharacterBadge />}
          </View>
        </View>
        {props.peer.isAi && (
          <AppText variant="caption" color="inkOnNight" maxFontSizeMultiplier={size.callOverlayMaxFontScale}>
            {t('call.aiNotice')}
          </AppText>
        )}
        {props.roomCode && (
          <AppText variant="caption" color="inkOnNight" maxFontSizeMultiplier={size.callOverlayMaxFontScale}>
            {t('call.roomCode')} {props.roomCode}
          </AppText>
        )}
        {statusKey && (
          <AppText variant="bodySm" color="inkOnNight" maxFontSizeMultiplier={size.callOverlayMaxFontScale}>
            {t(statusKey)}
          </AppText>
        )}
      </View>

      <View
        style={{
          position: 'absolute',
          left: space[4],
          right: space[4],
          bottom: space[12],
          flexDirection: 'row',
          justifyContent: 'space-around',
          alignItems: 'flex-start',
        }}
      >
        <CallControl
          label={props.muted ? t('call.unmute') : t('call.mute')}
          glyph={props.muted ? '🔇' : '🎙'}
          onPress={props.onToggleMute}
          testID="call-mute"
        />
        <CallControl label={t('call.swapAvatar')} glyph="◐" onPress={props.onSwapAvatar} testID="call-swap" />
        <CallControl label={t('safety.report')} glyph="⚑" variant="report" onPress={props.onReport} testID="call-report" />
        <CallControl label={t('call.end')} glyph="✕" variant="end" onPress={props.onEnd} testID="call-end" />
      </View>
    </View>
  );
}
