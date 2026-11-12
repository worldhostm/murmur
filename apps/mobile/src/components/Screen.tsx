import React from 'react';
import { KeyboardAvoidingView, Platform, SafeAreaView, ScrollView, View } from 'react-native';
import { useTheme } from '../theme';
import { BackButton } from './BackButton';
import { AppText } from './AppText';

export interface ScreenProps {
  children: React.ReactNode;
  fill?: boolean;
  testID?: string;
  onBack?: (() => void) | undefined;
  title?: string;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  keyboardAvoiding?: boolean;
  compact?: boolean;
}

/** Safe-area frame. Header and footer stay outside the single scrolling content region. */
export function Screen({
  children,
  fill = false,
  testID,
  onBack,
  title,
  header,
  footer,
  keyboardAvoiding = false,
  compact = false,
}: ScreenProps): React.JSX.Element {
  const { color, space, layout } = useTheme();
  const gap = compact ? space[2] : space[6];
  return (
    <SafeAreaView testID={testID} style={{ flex: 1, backgroundColor: color.surface100 }}>
      <KeyboardAvoidingView
        enabled={keyboardAvoiding}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <View
          style={{
            flex: 1,
            width: '100%',
            maxWidth: layout.contentMaxWidth,
            alignSelf: 'center',
            paddingHorizontal: space[4],
            paddingTop: space[4],
            paddingBottom: space[2],
            gap,
          }}
        >
          {(onBack || title || header) && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[2] }}>
              {onBack && <BackButton onPress={onBack} />}
              <View style={{ flex: 1 }}>
                {header ??
                  (title && (
                    <AppText variant="title" accessibilityRole="header">
                      {title}
                    </AppText>
                  ))}
              </View>
            </View>
          )}
          {fill ? (
            <View style={{ flex: 1, minHeight: 0, gap }}>{children}</View>
          ) : (
            <ScrollView
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ gap: space[6], paddingBottom: space[6] }}
            >
              {children}
            </ScrollView>
          )}
          {footer}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
