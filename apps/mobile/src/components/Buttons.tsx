import React from 'react';
import { Pressable } from 'react-native';
import type { PressableProps } from 'react-native';
import { AppText } from './AppText';
import { useTheme } from '../theme';

export interface ButtonProps extends Omit<PressableProps, 'style' | 'children'> {
  label: string;
}

/** 주 버튼. 배경 brand, 글자 on-brand, 높이 52, pill. 화면당 하나만 (DESIGN_SYSTEM.md §7). */
export function PrimaryButton({ label, disabled, ...rest }: ButtonProps): React.JSX.Element {
  const { color, space, radius, size } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      {...rest}
      style={({ pressed }) => ({
        minHeight: size.buttonHeight,
        paddingHorizontal: space[6],
        borderRadius: radius.pill,
        backgroundColor: color.brand,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: disabled ? 0.5 : pressed ? 0.85 : 1,
      })}
    >
      <AppText variant="label" color="onBrand">
        {label}
      </AppText>
    </Pressable>
  );
}

/** 보조 버튼. 배경 없음, 테두리 border, 글자 ink. */
export function SecondaryButton({ label, disabled, ...rest }: ButtonProps): React.JSX.Element {
  const { color, space, radius, size } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      {...rest}
      style={({ pressed }) => ({
        minHeight: size.buttonHeight,
        paddingHorizontal: space[6],
        borderRadius: radius.pill,
        borderWidth: 1,
        borderColor: color.border,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: disabled ? 0.5 : pressed ? 0.7 : 1,
      })}
    >
      <AppText variant="label" color="ink">
        {label}
      </AppText>
    </Pressable>
  );
}
