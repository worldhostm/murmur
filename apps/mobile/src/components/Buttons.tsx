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
        paddingVertical: space[3],
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
        paddingVertical: space[3],
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

/** Secondary navigation with a full accessible touch target. */
export function TextButton({
  label,
  disabled,
  destructive = false,
  ...rest
}: ButtonProps & { destructive?: boolean }): React.JSX.Element {
  const { space, size, color, radius } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      {...rest}
      style={({ pressed }) => ({
        backgroundColor: rest.accessibilityState?.selected ? color.surface200 : undefined,
        borderRadius: radius.sm,
        borderBottomWidth: rest.accessibilityState?.selected ? 2 : 0,
        borderColor: color.brand,
        minHeight: size.touchTarget,
        minWidth: size.touchTarget,
        paddingHorizontal: space[2],
        paddingVertical: space[2],
        justifyContent: 'center',
        opacity: disabled ? 0.5 : pressed ? 0.7 : 1,
      })}
    >
      <AppText variant="label" color={destructive ? 'danger' : 'ink'}>
        {label}
      </AppText>
    </Pressable>
  );
}
