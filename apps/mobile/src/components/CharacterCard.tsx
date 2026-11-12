import React from 'react';
import { Image, Pressable, View, useWindowDimensions } from 'react-native';
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

export function CharacterCard({
  character,
  selected = false,
  onPress,
}: CharacterCardProps): React.JSX.Element {
  const { t } = useTranslation();
  const { color, space, radius, layout } = useTheme();
  const { width, fontScale } = useWindowDimensions();
  const compact = width < layout.compactWidth || fontScale >= layout.largeFontScale;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={t(character.nameKey)}
      onPress={onPress}
      testID={`character-card-${character.id}`}
      style={({ pressed }) => ({
        borderRadius: radius.lg,
        overflow: 'hidden',
        backgroundColor: color.surface300,
        borderWidth: 2,
        borderColor: selected ? color.brand : color.border,
        opacity: pressed ? 0.85 : 1,
      })}
    >
      <View style={{ flexDirection: compact ? 'column' : 'row' }}>
        <Image
          testID={`character-portrait-${character.id}`}
          accessible={false}
          source={characterPortrait(character.id)}
          resizeMode="cover"
          style={{
            height: space[12] * 4,
            width: space[12] * 4 * PORTRAIT_ASPECT,
            alignSelf: compact ? 'center' : undefined,
            backgroundColor: color.night,
          }}
        />
        <View style={{ flex: 1, padding: space[4], gap: space[2], justifyContent: 'center' }}>
          <AppText variant="caption" color="inkMuted">
            {`${t(`concept.${character.concept}.name`)} · ${t(
              character.tone === 'night'
                ? 'characterSelect.toneNight'
                : 'characterSelect.toneLight',
            )}`}
          </AppText>
          <AppText variant="characterName">{t(character.nameKey)}</AppText>
          <AppText variant="bodySm">{t(character.roleKey)}</AppText>
          <AiCharacterBadge />
        </View>
      </View>
      {selected && (
        <View
          style={{
            paddingHorizontal: space[4],
            paddingVertical: space[3],
            borderTopWidth: 1,
            borderTopColor: color.border,
            gap: space[1],
          }}
        >
          <AppText variant="label" color="brand">
            {t('characterSelect.selected')}
          </AppText>
          <AppText variant="bodySm" color="inkMuted">
            {t(character.taglineKey)}
          </AppText>
        </View>
      )}
    </Pressable>
  );
}
