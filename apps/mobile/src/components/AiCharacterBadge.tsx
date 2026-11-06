import React from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { AppText } from './AppText';
import { useTheme } from '../theme';

/**
 * "AI 캐릭터" 표시. AI 캐릭터가 나오는 화면에는 항상 둔다 (CLAUDE.md 금지 사항, AI 기본법 표시 의무).
 * accent는 AI 존재 신호에만 쓰는 색이다.
 */
export function AiCharacterBadge(): React.JSX.Element {
  const { t } = useTranslation();
  const { color, space, radius } = useTheme();
  return (
    <View
      testID="ai-character-badge"
      accessibilityRole="text"
      accessibilityLabel={t('common.aiCharacter')}
      style={{
        alignSelf: 'flex-start',
        paddingHorizontal: space[2],
        paddingVertical: space[1],
        borderRadius: radius.sm,
        borderWidth: 1,
        borderColor: color.accent,
        backgroundColor: color.surface300,
      }}
    >
      <AppText variant="caption" color="accent">
        {t('common.aiCharacter')}
      </AppText>
    </View>
  );
}
