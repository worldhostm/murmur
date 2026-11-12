import React, { useState } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { AI_CHARACTERS, charactersByConcept } from '@murmur/shared-types';
import type { AiCharacterId } from '@murmur/shared-types';
import { AppText, CharacterCard, PrimaryButton, Screen } from '../components';
import { useTheme } from '../theme';

export interface CharacterSelectScreenProps {
  onConfirm: (id: AiCharacterId) => void;
  initial?: AiCharacterId | undefined;
  /** 왼쪽 상단 뒤로가기 (온보딩으로). */
  onBack?: () => void;
}

/** 캐릭터는 컨셉(docs/specs/character-roster.md) 순서로 묶어 보여 준다. 컨셉마다 이름과 한 줄 설명이 붙는다. */
export function CharacterSelectScreen({
  onConfirm,
  initial,
  onBack,
}: CharacterSelectScreenProps): React.JSX.Element {
  const { t } = useTranslation();
  const { space } = useTheme();
  const [selected, setSelected] = useState<AiCharacterId | undefined>(initial);
  return (
    <Screen
      testID="screen-character-select"
      title={t('design.companions')}
      onBack={onBack}
      footer={
        <PrimaryButton
          label={
            selected
              ? t('characterSelect.startWith', {
                  name: t(AI_CHARACTERS.find((c) => c.id === selected)!.nameKey),
                })
              : t('characterSelect.confirm')
          }
          disabled={!selected}
          onPress={() => selected && onConfirm(selected)}
          testID="character-select-confirm"
        />
      }
    >
      <View style={{ gap: space[2] }}>
        <AppText variant="characterName">{t('characterSelect.title')}</AppText>
        <AppText variant="bodySm" color="inkMuted">
          {t('characterSelect.subtitle')}
        </AppText>
        <AppText variant="bodySm" color="inkMuted">
          {t('characterSelect.conceptHint')}
        </AppText>
      </View>
      {charactersByConcept().map(({ concept, characters }) => (
        <View key={concept.id} testID={`concept-${concept.id}`} style={{ gap: space[3] }}>
          <View style={{ gap: space[1] }}>
            <AppText variant="heading" accessibilityRole="header">
              {t(concept.nameKey)}
            </AppText>
            <AppText variant="bodySm" color="inkMuted">
              {t(concept.descriptionKey)}
            </AppText>
          </View>
          <View style={{ gap: space[4] }}>
            {characters.map((c) => (
              <CharacterCard
                key={c.id}
                character={c}
                selected={selected === c.id}
                onPress={() => setSelected(c.id)}
              />
            ))}
          </View>
        </View>
      ))}
    </Screen>
  );
}
