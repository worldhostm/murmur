import React from 'react';
import { View } from 'react-native';
import { AppText } from './AppText';
import { useTheme } from '../theme';

export interface MoodCardProps {
  title: string;
  children?: React.ReactNode;
}

/** 솔로 모드 기분 카드: cream 배경, radius-md, 글자 ink. 라이트 톤이 차갑게 느껴지지 않게 하는 따뜻한 면. */
export function MoodCard({ title, children }: MoodCardProps): React.JSX.Element {
  const { color, space, radius } = useTheme();
  return (
    <View style={{ padding: space[4], borderRadius: radius.md, backgroundColor: color.cream, gap: space[2] }}>
      <AppText variant="heading" color="ink">
        {title}
      </AppText>
      {children}
    </View>
  );
}
