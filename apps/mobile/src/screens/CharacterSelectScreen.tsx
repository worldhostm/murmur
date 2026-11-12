import React, { useState } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { AI_CHARACTERS } from '@murmur/shared-types';
import type { AiCharacterId } from '@murmur/shared-types';
import { AppText, CharacterCard, PrimaryButton, Screen } from '../components';
import { useTheme } from '../theme';

export interface CharacterSelectScreenProps {
  onConfirm: (id: AiCharacterId) => void;
  initial?: AiCharacterId | undefined;
  /** 왼쪽 상단 뒤로가기 (온보딩으로). */
  onBack?: () => void;
}

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
      title={t('characterSelect.title')}
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
        <AppText variant="bodySm" color="inkMuted">
          {t('characterSelect.subtitle')}
        </AppText>
      </View>
      <View style={{ gap: space[3] }}>
        {AI_CHARACTERS.map((c) => (
          <CharacterCard
            key={c.id}
            character={c}
            selected={selected === c.id}
            onPress={() => setSelected(c.id)}
          />
        ))}
      </View>
    </Screen>
  );
}
