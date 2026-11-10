import React from 'react';
import { Image, Pressable, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { AiCharacterSummary } from '@murmur/shared-types';
import { AppText } from './AppText';
import { AiCharacterBadge } from './AiCharacterBadge';
import { useTheme } from '../theme';
import { characterPortrait, PORTRAIT_ASPECT } from '../avatar/characterImages';

export interface CharacterCardProps {
  character: AiCharacterSummary;
  selected?: boolean;
  onPress?: () => void;
}

/** 캐릭터 카드: surface-300, radius-lg, 왼쪽 초상(137:240), 이름 display-md, 세계관 한 줄 body-sm ink-muted. */
export function CharacterCard({
  character,
  selected = false,
  onPress,
}: CharacterCardProps): React.JSX.Element {
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
        flexDirection: 'row',
        gap: space[3],
      }}
    >
      <Image
        testID={`character-portrait-${character.id}`}
        accessible={false}
        source={characterPortrait(character.id)}
        resizeMode="cover"
        style={{
          height: space[12] * 2.5,
          width: space[12] * 2.5 * PORTRAIT_ASPECT,
          borderRadius: radius.md,
          backgroundColor: color.night,
        }}
      />
      <View style={{ flex: 1, gap: space[2] }}>
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: space[2],
          }}
        >
          <AppText variant="displayMd" color="ink" style={{ flexShrink: 1 }}>
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
            {character.tone === 'night'
              ? t('characterSelect.toneNight')
              : t('characterSelect.toneLight')}
          </AppText>
        </View>
      </View>
    </Pressable>
  );
}
