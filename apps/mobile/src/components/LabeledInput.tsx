import React, { useState } from 'react';
import { TextInput, View } from 'react-native';
import type { TextInputProps } from 'react-native';
import { AppText } from './AppText';
import { useTheme } from '../theme';

export interface LabeledInputProps extends TextInputProps {
  label: string;
  hint?: string;
  error?: string;
}

export function LabeledInput({
  label,
  hint,
  error,
  style,
  onFocus,
  onBlur,
  ...props
}: LabeledInputProps): React.JSX.Element {
  const { color, space, radius, text, layout } = useTheme();
  const [focused, setFocused] = useState(false);
  return (
    <View style={{ gap: space[2] }}>
      <AppText variant="label">{label}</AppText>
      <TextInput
        {...props}
        accessibilityLabel={props.accessibilityLabel ?? label}
        placeholderTextColor={color.inkMuted}
        onFocus={(event) => {
          setFocused(true);
          onFocus?.(event);
        }}
        onBlur={(event) => {
          setFocused(false);
          onBlur?.(event);
        }}
        style={[
          text.body,
          {
            minHeight: layout.inputMinHeight,
            color: color.ink,
            backgroundColor: color.surface200,
            borderWidth: 1,
            borderColor: error ? color.danger : focused ? color.brand : color.borderStrong,
            borderRadius: radius.sm,
            paddingHorizontal: space[3],
            paddingVertical: space[3],
            textAlignVertical: props.multiline ? 'top' : 'center',
          },
          style,
        ]}
      />
      {(error || hint) && (
        <AppText
          variant="bodySm"
          color={error ? 'danger' : 'inkMuted'}
          accessibilityLiveRegion={error ? 'polite' : 'none'}
        >
          {error ?? hint}
        </AppText>
      )}
    </View>
  );
}
