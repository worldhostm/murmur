import React from 'react';
import { Pressable } from 'react-native';
import { AppText } from './AppText';
import { useTheme, withAlpha } from '../theme';

export interface CallControlProps {
  /** 접근성 라벨이자 버튼 아래 캡션. */
  label: string;
  /** 아이콘 글리프(임시). 아이콘 세트 도입 전까지 텍스트 글리프를 쓴다. */
  glyph: string;
  variant?: 'default' | 'end' | 'report';
  onPress?: () => void;
  testID?: string;
}

/**
 * 통화 컨트롤 (DESIGN_SYSTEM.md §7): 지름 56 원형, night 80%, 아이콘 ink-on-night.
 * 종료는 danger 배경. 신고는 danger 글자 + 문구. 테마와 무관하게 night 오버레이를 쓴다.
 */
export function CallControl({ label, glyph, variant = 'default', onPress, testID }: CallControlProps): React.JSX.Element {
  const { color, size, radius, space } = useTheme();
  const isEnd = variant === 'end';
  const isReport = variant === 'report';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      testID={testID}
      hitSlop={(size.touchTarget - size.callControl) / 2 > 0 ? (size.touchTarget - size.callControl) / 2 : 0}
      style={{ alignItems: 'center', gap: space[1], minWidth: size.touchTarget }}
    >
      <Pressable
        pointerEvents="none"
        style={{
          width: size.callControl,
          height: size.callControl,
          borderRadius: radius.pill,
          backgroundColor: isEnd ? color.danger : withAlpha(color.night, 0.8),
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <AppText variant="heading" color={isReport ? 'danger' : 'inkOnNight'}>
          {glyph}
        </AppText>
      </Pressable>
      <AppText variant="caption" color={isReport ? 'danger' : 'inkOnNight'}>
        {label}
      </AppText>
    </Pressable>
  );
}
