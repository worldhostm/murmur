import React from 'react';
import { Pressable, View } from 'react-native';
import { AppText } from './AppText';
import { useTheme } from '../theme';

export function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
  disabled = false,
}: {
  value: T;
  options: readonly { value: T; label: string; testID?: string }[];
  onChange: (value: T) => void;
  disabled?: boolean;
}): React.JSX.Element {
  const { color, radius, space, size } = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        backgroundColor: color.surface200,
        borderRadius: radius.md,
        padding: space[1],
        gap: space[1],
      }}
    >
      {options.map((option) => (
        <Pressable
          key={option.value}
          testID={option.testID}
          accessibilityRole="tab"
          accessibilityState={{ selected: option.value === value, disabled }}
          disabled={disabled}
          onPress={() => onChange(option.value)}
          style={({ pressed }) => ({
            flex: 1,
            minHeight: size.touchTarget,
            paddingHorizontal: space[2],
            paddingVertical: space[2],
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: radius.sm,
            backgroundColor: option.value === value ? color.surface300 : undefined,
            opacity: disabled ? 0.5 : pressed ? 0.7 : 1,
          })}
        >
          <AppText variant="label" style={{ textAlign: 'center' }}>
            {option.label}
          </AppText>
        </Pressable>
      ))}
    </View>
  );
}
