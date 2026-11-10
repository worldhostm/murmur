import React, { useRef, useState } from 'react';
import { Image, Pressable, ScrollView, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { AI_CHARACTERS } from '@murmur/shared-types';
import type { AiCharacterId } from '@murmur/shared-types';
import {
  AiCharacterBadge,
  AppText,
  ChatBubble,
  MoodCard,
  PrimaryButton,
  Screen,
  SecondaryButton,
  SpeakingIndicator,
} from '../components';
import { useTheme, withAlpha } from '../theme';
import { characterPortrait } from '../avatar/characterImages';

export interface SoloMessage {
  id: string;
  from: 'me' | 'character';
  text: string;
}

export interface SoloScreenProps {
  characterId: AiCharacterId;
  messages: SoloMessage[];
  speaking?: boolean;
  /** 장시간·심야 사용 시 부드러운 휴식 권유. 체류 시간을 늘리는 설계는 하지 않는다. */
  restSuggestion?: 'none' | 'long-session' | 'late-night';
  onSend: (text: string) => void;
  onSaveMood: (text: string) => void;
  onCallFriend: () => void;
  onRest?: () => void;
  onDismissRest?: () => void;
  /** 캐릭터 아바타 렌더 영역(통화 화면과 같은 UnityView). 있으면 상단에 초상 카드로 보인다. */
  renderer?: React.ReactNode;
  /** 왼쪽 상단 뒤로가기 (캐릭터 고르기로). */
  onBack?: () => void;
  /** 표정 반응을 눌러서 확인하는 예시 문장 칩 (개발 빌드 전용). 누르면 그대로 보낸다. */
  samplePrompts?: readonly string[] | undefined;
  /** 아바타 카드를 상단에 고정할지(기본 true). 해제하면 대화와 같이 스크롤된다. 카드의 토글로 바꾼다. */
  defaultAvatarPinned?: boolean;
}

/**
 * 솔로 모드 (PLANNING.md 시나리오 C). 기본 light 테마.
 * 캐릭터가 먼저 말을 걸고, 대화 끝에 기분 한 줄을 남긴다. 친구 통화로 이어지는 동선을 둔다.
 * 화면에 "AI 캐릭터" 표시를 항상 둔다.
 */
export function SoloScreen(props: SoloScreenProps): React.JSX.Element {
  const { t } = useTranslation();
  const { color, space, radius, text, reduceMotion } = useTheme();
  const [draft, setDraft] = useState('');
  const [mood, setMood] = useState('');
  const [pinned, setPinned] = useState(props.defaultAvatarPinned ?? true);
  const scrollRef = useRef<ScrollView>(null);
  const hasAvatar = props.renderer !== undefined;
  const fixedAvatar = hasAvatar && pinned;
  const character = AI_CHARACTERS.find((c) => c.id === props.characterId) ?? AI_CHARACTERS[0]!;
  const name = t(character.nameKey);
  const rest = props.restSuggestion ?? 'none';

  const avatarCard = hasAvatar ? (
    <View
      testID="solo-avatar"
      style={{
        height: space[12] * 5,
        borderRadius: radius.lg,
        overflow: 'hidden',
        backgroundColor: color.lavender,
      }}
    >
      {props.renderer}
      <Pressable
        accessibilityRole="switch"
        accessibilityState={{ checked: pinned }}
        accessibilityLabel={pinned ? t('solo.avatarPinned') : t('solo.avatarScrolls')}
        testID={pinned ? 'solo-avatar-pin-on' : 'solo-avatar-pin-off'}
        onPress={() => setPinned((v) => !v)}
        style={({ pressed }) => ({
          position: 'absolute',
          top: space[2],
          right: space[2],
          flexDirection: 'row',
          alignItems: 'center',
          gap: space[1],
          paddingHorizontal: space[3],
          paddingVertical: space[1],
          borderRadius: radius.pill,
          backgroundColor: withAlpha(color.night, 0.8),
          opacity: pressed ? 0.7 : 1,
        })}
      >
        <AppText variant="caption" color="inkOnNight">
          {pinned ? '📌' : '↕'}
        </AppText>
        <AppText variant="caption" color="inkOnNight">
          {pinned ? t('solo.avatarPinned') : t('solo.avatarScrolls')}
        </AppText>
      </Pressable>
    </View>
  ) : null;

  const body = (
    <>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[3] }}>
        <SpeakingIndicator speaking={!!props.speaking} diameter={48}>
          <Image
            testID="solo-portrait"
            accessible={false}
            source={characterPortrait(character.id)}
            resizeMode="cover"
            style={{
              width: 40,
              height: 40,
              borderRadius: radius.pill,
              backgroundColor: color.lavender,
            }}
          />
        </SpeakingIndicator>
        <View style={{ gap: space[1] }}>
          <AppText variant="heading">{name}</AppText>
          <AiCharacterBadge />
        </View>
      </View>

      {rest !== 'none' && (
        <View
          testID="rest-suggestion"
          style={{
            padding: space[4],
            borderRadius: radius.md,
            backgroundColor: color.brandSoft,
            gap: space[3],
          }}
        >
          <AppText variant="heading">{t('solo.restTitle')}</AppText>
          <AppText variant="bodySm" color="inkMuted">
            {rest === 'late-night' ? t('solo.lateNightBody') : t('solo.restBody')}
          </AppText>
          <View style={{ flexDirection: 'row', gap: space[2] }}>
            <SecondaryButton label={t('solo.restOk')} onPress={props.onRest} />
            <SecondaryButton label={t('solo.restContinue')} onPress={props.onDismissRest} />
          </View>
        </View>
      )}

      <View>
        {props.messages.length === 0 && (
          <ChatBubble side="other" isAi name={name} text={t('solo.greeting')} />
        )}
        {props.messages.map((m) =>
          m.from === 'me' ? (
            <ChatBubble key={m.id} side="me" text={m.text} />
          ) : (
            <ChatBubble key={m.id} side="other" isAi name={name} text={m.text} />
          ),
        )}
      </View>

      {props.samplePrompts && props.samplePrompts.length > 0 && (
        <View
          testID="solo-samples"
          style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space[2] }}
        >
          {props.samplePrompts.map((sample) => (
            <Pressable
              key={sample}
              accessibilityRole="button"
              testID="solo-sample"
              onPress={() => props.onSend(sample)}
              style={({ pressed }) => ({
                paddingHorizontal: space[3],
                paddingVertical: space[1],
                borderRadius: radius.pill,
                borderWidth: 1,
                borderColor: color.border,
                backgroundColor: color.surface200,
                opacity: pressed ? 0.6 : 1,
              })}
            >
              <AppText variant="caption" color="inkMuted">
                {sample}
              </AppText>
            </Pressable>
          ))}
        </View>
      )}
      <View style={{ flexDirection: 'row', gap: space[2], alignItems: 'center' }}>
        <TextInput
          testID="solo-input"
          value={draft}
          onChangeText={setDraft}
          placeholder={t('solo.inputPlaceholder')}
          placeholderTextColor={color.inkMuted}
          style={[
            text.body,
            {
              flex: 1,
              color: color.ink,
              backgroundColor: color.surface200,
              borderRadius: radius.sm,
              borderWidth: 1,
              borderColor: color.border,
              paddingHorizontal: space[3],
              paddingVertical: space[3],
            },
          ]}
        />
        <PrimaryButton
          label={t('solo.send')}
          disabled={draft.trim().length === 0}
          onPress={() => {
            props.onSend(draft.trim());
            setDraft('');
          }}
          testID="solo-send"
        />
      </View>

      <MoodCard title={t('solo.moodTitle')}>
        <TextInput
          testID="mood-input"
          value={mood}
          onChangeText={setMood}
          placeholder={t('solo.moodPlaceholder')}
          placeholderTextColor={color.inkMuted}
          style={[text.body, { color: color.ink, paddingVertical: space[2] }]}
        />
        <SecondaryButton
          label={t('solo.moodSave')}
          disabled={mood.trim().length === 0}
          onPress={() => props.onSaveMood(mood.trim())}
        />
      </MoodCard>

      <SecondaryButton
        label={t('solo.callFriend')}
        onPress={props.onCallFriend}
        testID="solo-call-friend"
      />
    </>
  );

  if (fixedAvatar) {
    // 고정: 아바타는 스크롤 밖 상단, 나머지는 아래 ScrollView. 새 말풍선이 생기면 끝으로 내린다.
    return (
      <Screen testID="screen-solo" onBack={props.onBack} fill>
        {avatarCard}
        <ScrollView
          ref={scrollRef}
          testID="solo-scroll"
          style={{ flex: 1 }}
          contentContainerStyle={{ gap: space[6], paddingBottom: space[6] }}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: !reduceMotion })}
        >
          {body}
        </ScrollView>
      </Screen>
    );
  }
  return (
    <Screen testID="screen-solo" onBack={props.onBack}>
      {avatarCard}
      {body}
    </Screen>
  );
}
