import React from 'react';
import { SafeAreaView, ScrollView, View } from 'react-native';
import { useTheme } from '../theme';

export interface ScreenProps {
  children: React.ReactNode;
  /** 통화 화면처럼 스크롤 없이 꽉 채우는 경우. */
  fill?: boolean;
  testID?: string;
}

/** 화면 바탕: surface-100, 좌우 space-4, 상단 space-8. */
export function Screen({ children, fill = false, testID }: ScreenProps): React.JSX.Element {
  const { color, space } = useTheme();
  const inner = { paddingHorizontal: space[4], paddingTop: space[8], paddingBottom: space[6], gap: space[6] };
  return (
    <SafeAreaView testID={testID} style={{ flex: 1, backgroundColor: color.surface100 }}>
      {fill ? (
        <View style={[inner, { flex: 1 }]}>{children}</View>
      ) : (
        <ScrollView contentContainerStyle={inner}>{children}</ScrollView>
      )}
    </SafeAreaView>
  );
}
