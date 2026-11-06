import React, { useState } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { AI_CHARACTERS } from '@murmur/shared-types';
import type { AiCharacterId } from '@murmur/shared-types';
import { AppText, CharacterCard, PrimaryButton, Screen } from '../components';
import { useTheme } from '../theme';

export interface CharacterSelectScreenProps {
  onConfirm: (id: AiCharacterId) => void;
  initial?: AiCharacterId;
}

export function CharacterSelectScreen({ onConfirm, initial }: CharacterSelectScreenProps): React.JSX.Element {
  const { t } = useTranslation();
  const { space } = useTheme();
  const [selected, setSelected] = useState<AiCharacterId | undefined>(initial);
  return (
    <Screen testID="screen-character-select">
      <View style={{ gap: space[2] }}>
        <AppText variant="title">{t('characterSelect.title')}</AppText>
        <AppText variant="bodySm" color="inkMuted">
          {t('characterSelect.subtitle')}
        </AppText>
      </View>
      <View style={{ gap: space[3] }}>
        {AI_CHARACTERS.map((c) => (
          <CharacterCard key={c.id} character={c} selected={selected === c.id} onPress={() => setSelected(c.id)} />
        ))}
      </View>
      <PrimaryButton
        label={t('characterSelect.confirm')}
        disabled={!selected}
        onPress={() => selected && onConfirm(selected)}
        testID="character-select-confirm"
      />
    </Screen>
  );
}
