import React from 'react';
import { Text } from 'react-native';
import type { TextProps } from 'react-native';
import type { ColorToken, TextStyleToken } from '@murmur/design-tokens';
import { useTheme } from '../theme';

export interface AppTextProps extends TextProps {
  /** 텍스트 스타일 토큰 (DESIGN_SYSTEM.md §4). 기본 body. */
  variant?: TextStyleToken;
  /** 글자색 토큰. 기본 ink. 새 글자/배경 조합은 design-tokens의 대비 테스트에 먼저 추가한다. */
  color?: ColorToken;
}

/** 모든 글자는 이 컴포넌트를 거친다. RN Text를 직접 쓰지 않는다. */
export function AppText({ variant = 'body', color = 'ink', style, ...rest }: AppTextProps): React.JSX.Element {
  const theme = useTheme();
  return <Text {...rest} style={[theme.text[variant], { color: theme.color[color] }, style]} />;
}
