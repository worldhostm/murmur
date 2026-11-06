import React, { useEffect, useRef } from 'react';
import { Animated, Easing, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../theme';

export interface SpeakingIndicatorProps {
  speaking: boolean;
  /** 링이 감쌀 대상의 지름. */
  diameter?: number;
  children?: React.ReactNode;
}

/**
 * 말하는 중 표시 (DESIGN_SYSTEM.md §7, §8): accent 물결 링 3개가 1.2초 주기로 퍼진다.
 * "동작 줄이기"면 정지 상태(세 링 고정)로 그린다. 물결은 유일한 브랜드 모티프다.
 */
export function SpeakingIndicator({ speaking, diameter = 56, children }: SpeakingIndicatorProps): React.JSX.Element {
  const { t } = useTranslation();
  const { color, motion, reduceMotion } = useTheme();
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!speaking || reduceMotion) {
      progress.stopAnimation();
      progress.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.timing(progress, {
        toValue: 1,
        duration: motion.speakingRippleMs,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [speaking, reduceMotion, progress, motion.speakingRippleMs]);

  const rings = Array.from({ length: motion.speakingRippleCount }, (_, i) => i);
  const staticScale = (i: number) => 1 + (i + 1) * 0.25;

  return (
    <View
      accessibilityLabel={speaking ? t('common.speaking') : undefined}
      testID="speaking-indicator"
      style={{ width: diameter, height: diameter, alignItems: 'center', justifyContent: 'center' }}
    >
      {speaking &&
        rings.map((i) => {
          const phase = i / motion.speakingRippleCount;
          const animated = !reduceMotion;
          const scale = animated
            ? progress.interpolate({
                inputRange: [0, 1],
                outputRange: [1 + phase * 0.75, 1.75 + phase * 0.75],
              })
            : staticScale(i);
          const opacity = animated
            ? progress.interpolate({ inputRange: [0, 1], outputRange: [0.6 - phase * 0.3, 0] })
            : 0.5 - i * 0.15;
          return (
            <Animated.View
              key={i}
              testID={animated ? 'speaking-ring-animated' : 'speaking-ring-static'}
              pointerEvents="none"
              style={{
                position: 'absolute',
                width: diameter,
                height: diameter,
                borderRadius: diameter / 2,
                borderWidth: 2,
                borderColor: color.accent,
                transform: [{ scale }],
                opacity,
              }}
            />
          );
        })}
      {children}
    </View>
  );
}
