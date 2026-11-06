import React from 'react';
import { Pressable, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { AiCharacterSummary } from '@murmur/shared-types';
import { AppText } from './AppText';
import { AiCharacterBadge } from './AiCharacterBadge';
import { useTheme } from '../theme';

export interface CharacterCardProps {
  character: AiCharacterSummary;
  selected?: boolean;
  onPress?: () => void;
}

/** 캐릭터 카드: surface-300, radius-lg, 이름 display-md, 세계관 한 줄 body-sm ink-muted. */
export function CharacterCard({ character, selected = false, onPress }: CharacterCardProps): React.JSX.Element {
  const { t } = useTranslation();
  const { color, space, radius } = useTheme();
  const name = t(character.nameKey);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={name}
      onPress={onPress}
      testID={`character-card-${character.id}`}
      style={{
        padding: space[4],
        borderRadius: radius.lg,
        backgroundColor: color.surface300,
        borderWidth: selected ? 2 : 1,
        borderColor: selected ? color.brand : color.border,
        gap: space[2],
      }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <AppText variant="displayMd" color="ink">
          {name}
        </AppText>
        <AiCharacterBadge />
      </View>
      <AppText variant="bodySm" color="inkMuted">
        {t(character.taglineKey)}
      </AppText>
      <AppText variant="bodySm" color="ink">
        {t(character.roleKey)}
      </AppText>
      <View
        style={{
          alignSelf: 'flex-start',
          paddingHorizontal: space[2],
          paddingVertical: space[1],
          borderRadius: radius.sm,
          backgroundColor: color.brandSoft,
        }}
      >
        <AppText variant="caption" color="brand">
          {character.tone === 'night' ? t('characterSelect.toneNight') : t('characterSelect.toneLight')}
        </AppText>
      </View>
    </Pressable>
  );
}
