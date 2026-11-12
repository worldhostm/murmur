import React, { useEffect, useRef, useState } from 'react';
import {
  BackHandler,
  FlatList,
  Image,
  Keyboard,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { AI_CHARACTERS } from '@murmur/shared-types';
import type { AiCharacterId } from '@murmur/shared-types';
import {
  AiCharacterBadge,
  AppText,
  ChatBubble,
  LabeledInput,
  MoodCard,
  PrimaryButton,
  Screen,
  SecondaryButton,
  TextButton,
} from '../components';
import { useTheme } from '../theme';
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
  replyFailed?: boolean;
  /** 장시간·심야 사용 시 부드러운 휴식 권유. 체류 시간을 늘리는 설계는 하지 않는다. */
  restSuggestion?: 'none' | 'long-session' | 'late-night';
  onSend: (text: string) => void;
  onSaveMood: (text: string) => void;
  moodPanel?: React.ReactNode;
  onCallFriend: () => void;
  onRest?: () => void;
  onDismissRest?: () => void;
  /** 캐릭터 아바타 렌더 영역(통화 화면과 같은 UnityView). 있으면 상단에 초상 카드로 보인다. */
  renderer?: React.ReactNode;
  /** 왼쪽 상단 뒤로가기 (캐릭터 고르기로). */
  onBack?: () => void;
  /** 표정 반응을 눌러서 확인하는 예시 문장 칩 (개발 빌드 전용). 누르면 그대로 보낸다. */
  samplePrompts?: readonly string[] | undefined;
  /** 아바타 펼침 기본값. 키보드/작은 화면에서는 자동 축소한다. */
  defaultAvatarPinned?: boolean;
}

/** The message list scrolls independently; the composer stays above the keyboard. */
export function SoloScreen(props: SoloScreenProps): React.JSX.Element {
  const { t } = useTranslation();
  const { color, space, radius, text, layout, reduceMotion } = useTheme();
  const { width, height, fontScale } = useWindowDimensions();
  const [draft, setDraft] = useState('');
  const [mood, setMood] = useState('');
  const [recordsOpen, setRecordsOpen] = useState(false);
  const [expanded, setExpanded] = useState(props.defaultAvatarPinned ?? true);
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const [inputHeight, setInputHeight] = useState<number>(layout.inputMinHeight);
  const [availableHeight, setAvailableHeight] = useState(height);
  const [unseen, setUnseen] = useState(false);
  const [focused, setFocused] = useState(false);
  const list = useRef<FlatList<SoloMessage>>(null);
  const following = useRef(true);
  const lastMessage = props.messages.at(-1)?.id;
  const lastSeen = useRef(lastMessage);
  const character = AI_CHARACTERS.find((c) => c.id === props.characterId) ?? AI_CHARACTERS[0]!;
  const name = t(character.nameKey);
  const compact = width < layout.compactWidth || fontScale >= layout.largeFontScale;
  const showAvatar =
    props.renderer !== undefined && expanded && !keyboardOpen && !compact && height > width;
  const rest = props.restSuggestion ?? 'none';

  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () => setKeyboardOpen(true));
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboardOpen(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  useEffect(() => {
    if (lastSeen.current !== lastMessage && !following.current) setUnseen(true);
    lastSeen.current = lastMessage;
  }, [lastMessage]);
  useEffect(() => {
    if (!recordsOpen) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      setRecordsOpen(false);
      return true;
    });
    return () => sub.remove();
  }, [recordsOpen]);
  const goToLatest = () => {
    following.current = true;
    setUnseen(false);
    list.current?.scrollToEnd({ animated: !reduceMotion });
  };
  const send = (value: string) => {
    if (props.speaking || !value.trim()) return;
    following.current = true;
    setUnseen(false);
    props.onSend(value.trim());
  };
  const maxInputHeight = text.body.lineHeight * fontScale * layout.inputMaxLines + space[3] * 2;
  const composer = (
    <View testID="solo-composer" style={{ gap: space[2] }}>
      {(props.speaking || props.replyFailed) && (
        <AppText variant="bodySm" accessibilityLiveRegion="polite" testID="solo-reply-status">
          {t(props.speaking ? 'solo.replyPending' : 'solo.replyFailed')}
        </AppText>
      )}
      <View
        style={{ flexDirection: compact ? 'column' : 'row', alignItems: 'stretch', gap: space[2] }}
      >
        <TextInput
          testID="solo-input"
          accessibilityLabel={t('solo.inputPlaceholder')}
          value={draft}
          onChangeText={setDraft}
          placeholder={t('solo.inputPlaceholder')}
          placeholderTextColor={color.inkMuted}
          multiline
          blurOnSubmit={false}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onContentSizeChange={(event) => setInputHeight(event.nativeEvent.contentSize.height)}
          style={[
            text.body,
            {
              flex: compact ? undefined : 1,
              minHeight: layout.inputMinHeight,
              height: Math.max(layout.inputMinHeight, Math.min(inputHeight, maxInputHeight)),
              maxHeight: maxInputHeight,
              color: color.ink,
              backgroundColor: color.surface200,
              borderRadius: radius.sm,
              borderWidth: 1,
              borderColor: focused ? color.brand : color.borderStrong,
              paddingHorizontal: space[3],
              paddingVertical: space[3],
              textAlignVertical: 'top',
            },
          ]}
        />
        <PrimaryButton
          label={t('solo.send')}
          disabled={!!props.speaking || !draft.trim()}
          testID="solo-send"
          onPress={() => {
            if (props.speaking || !draft.trim()) return;
            send(draft);
            setDraft('');
            setInputHeight(layout.inputMinHeight);
          }}
        />
      </View>
    </View>
  );
  const header = (
    <View style={{ gap: space[1] }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[2] }}>
        <Image
          testID="solo-portrait"
          accessible={false}
          source={characterPortrait(character.id)}
          style={{
            width: layout.compactAvatarSize,
            height: layout.compactAvatarSize,
            borderRadius: radius.pill,
          }}
        />
        <View style={{ flex: 1, gap: space[1] }}>
          <AppText variant="heading">{name}</AppText>
          <AiCharacterBadge />
        </View>
        <TextButton
          testID="solo-records-open"
          label={t('solo.records')}
          onPress={() => {
            Keyboard.dismiss();
            setRecordsOpen(true);
          }}
        />
      </View>
    </View>
  );
  return (
    <View style={{ flex: 1 }}>
      <View
        style={{ flex: 1, display: recordsOpen ? 'none' : 'flex' }}
        accessibilityElementsHidden={recordsOpen}
        importantForAccessibility={recordsOpen ? 'no-hide-descendants' : 'auto'}
      >
        <Screen
          testID="screen-solo"
          fill
          compact
          keyboardAvoiding
          onBack={props.onBack}
          header={header}
          footer={composer}
        >
          <View
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              justifyContent: 'space-between',
              gap: space[2],
            }}
          >
            {props.renderer !== undefined && (
              <TextButton
                testID="solo-avatar-toggle"
                accessibilityState={{ expanded: showAvatar }}
                disabled={keyboardOpen || compact || height <= width}
                label={t(showAvatar ? 'solo.avatarCollapse' : 'solo.avatarExpand')}
                onPress={() => setExpanded((v) => !v)}
              />
            )}
            <TextButton
              label={t('solo.callFriend')}
              onPress={props.onCallFriend}
              testID="solo-call-friend"
            />
          </View>
          <View
            style={{ flex: 1, minHeight: 0, gap: space[2] }}
            onLayout={(event) => setAvailableHeight(event.nativeEvent.layout.height)}
          >
            {showAvatar && (
              <View
                testID="solo-avatar"
                style={{
                  height: Math.min(
                    layout.soloAvatarHeight,
                    availableHeight * layout.soloAvatarMaxHeightRatio,
                  ),
                  borderRadius: radius.lg,
                  overflow: 'hidden',
                  backgroundColor: color.lavender,
                }}
              >
                {props.renderer}
              </View>
            )}
            <FlatList
              ref={list}
              testID="solo-scroll"
              data={props.messages}
              keyExtractor={(m) => m.id}
              style={{ flex: 1 }}
              keyboardShouldPersistTaps="handled"
              scrollEventThrottle={16}
              contentContainerStyle={{ paddingVertical: space[2] }}
              onScroll={(event) => {
                const { contentSize, contentOffset, layoutMeasurement } = event.nativeEvent;
                following.current =
                  contentSize.height - contentOffset.y - layoutMeasurement.height <= space[12];
                if (following.current) setUnseen(false);
              }}
              onContentSizeChange={() => {
                if (following.current) list.current?.scrollToEnd({ animated: !reduceMotion });
              }}
              ListHeaderComponent={
                rest !== 'none' ? (
                  <View testID="rest-suggestion" style={{ padding: space[4], gap: space[2] }}>
                    <AppText variant="heading">{t('solo.restTitle')}</AppText>
                    <AppText variant="bodySm">
                      {t(rest === 'late-night' ? 'solo.lateNightBody' : 'solo.restBody')}
                    </AppText>
                    <SecondaryButton label={t('solo.restOk')} onPress={props.onRest} />
                    <TextButton label={t('solo.restContinue')} onPress={props.onDismissRest} />
                  </View>
                ) : null
              }
              ListEmptyComponent={
                <ChatBubble side="other" isAi name={name} text={t('solo.greeting')} />
              }
              renderItem={({ item }) =>
                item.from === 'me' ? (
                  <ChatBubble side="me" text={item.text} />
                ) : (
                  <ChatBubble side="other" isAi name={name} text={item.text} />
                )
              }
              ListFooterComponent={
                props.samplePrompts?.length ? (
                  <View testID="solo-samples" style={{ gap: space[2] }}>
                    {props.samplePrompts.map((sample) => (
                      <TextButton
                        key={sample}
                        testID="solo-sample"
                        label={sample}
                        disabled={!!props.speaking}
                        onPress={() => send(sample)}
                      />
                    ))}
                  </View>
                ) : null
              }
            />
            {unseen && (
              <TextButton
                testID="solo-new-messages"
                label={t('solo.newMessages')}
                onPress={goToLatest}
              />
            )}
          </View>
        </Screen>
      </View>
      <View
        style={{ flex: 1, display: recordsOpen ? 'flex' : 'none' }}
        accessibilityElementsHidden={!recordsOpen}
        importantForAccessibility={recordsOpen ? 'auto' : 'no-hide-descendants'}
      >
        <Screen
          testID="screen-records"
          title={t('solo.records')}
          onBack={() => setRecordsOpen(false)}
          keyboardAvoiding
        >
          {props.moodPanel ?? (
            <MoodCard title={t('solo.moodTitle')}>
              <LabeledInput
                label={t('solo.moodTitle')}
                testID="mood-input"
                value={mood}
                onChangeText={setMood}
                multiline
                maxLength={500}
                placeholder={t('solo.moodPlaceholder')}
              />
              <PrimaryButton
                label={t('solo.moodSave')}
                disabled={!mood.trim()}
                onPress={() => props.onSaveMood(mood.trim())}
              />
            </MoodCard>
          )}
        </Screen>
      </View>
    </View>
  );
}
