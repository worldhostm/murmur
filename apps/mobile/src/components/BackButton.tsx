import React from 'react';
import { Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { AppText } from './AppText';
import { useTheme } from '../theme';

export interface BackButtonProps {
  onPress: () => void;
  testID?: string;
}

/**
 * 화면 왼쪽 상단 뒤로가기. 글리프 + "뒤로" 문구, 터치 영역은 size.touchTarget 이상.
 * 아이콘 세트 도입 전까지 텍스트 글리프를 쓴다 (CallControl 과 같은 방식).
 */
export function BackButton({
  onPress,
  testID = 'back-button',
}: BackButtonProps): React.JSX.Element {
  const { t } = useTranslation();
  const { space, size, radius } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('common.back')}
      onPress={onPress}
      testID={testID}
      style={({ pressed }) => ({
        alignSelf: 'flex-start',
        flexDirection: 'row',
        alignItems: 'center',
        gap: space[1],
        minHeight: size.touchTarget,
        paddingRight: space[3],
        borderRadius: radius.pill,
        opacity: pressed ? 0.6 : 1,
      })}
    >
      <AppText variant="heading" color="ink">
        ‹
      </AppText>
      <AppText variant="label" color="ink">
        {t('common.back')}
      </AppText>
    </Pressable>
  );
}
