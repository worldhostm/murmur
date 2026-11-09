import React, { useState } from 'react';
import { TextInput, View } from 'react-native';
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
import { useTheme } from '../theme';

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
}

/**
 * 솔로 모드 (PLANNING.md 시나리오 C). 기본 light 테마.
 * 캐릭터가 먼저 말을 걸고, 대화 끝에 기분 한 줄을 남긴다. 친구 통화로 이어지는 동선을 둔다.
 * 화면에 "AI 캐릭터" 표시를 항상 둔다.
 */
export function SoloScreen(props: SoloScreenProps): React.JSX.Element {
  const { t } = useTranslation();
  const { color, space, radius, text } = useTheme();
  const [draft, setDraft] = useState('');
  const [mood, setMood] = useState('');
  const character = AI_CHARACTERS.find((c) => c.id === props.characterId) ?? AI_CHARACTERS[0]!;
  const name = t(character.nameKey);
  const rest = props.restSuggestion ?? 'none';

  return (
    <Screen testID="screen-solo">
      {props.renderer !== undefined && (
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
        </View>
      )}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[3] }}>
        <SpeakingIndicator speaking={!!props.speaking} diameter={48}>
          <View
            testID="avatar-placeholder"
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
    </Screen>
  );
}
